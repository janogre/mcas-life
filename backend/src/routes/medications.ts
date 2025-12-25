import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { medicationsCatalog, userMedications } from '../db/schema.js';
import { like, or, sql, desc } from 'drizzle-orm';
import { authenticateToken } from '../services/auth/index.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/medications/search?q=query
 * Search medications catalog
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters',
      });
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Search by name or active substance
    const results = await db
      .select({
        id: medicationsCatalog.id,
        name: medicationsCatalog.name,
        active_substance: medicationsCatalog.active_substance,
        form: medicationsCatalog.form,
        strength: medicationsCatalog.strength,
        prescription_required: medicationsCatalog.prescription_required,
      })
      .from(medicationsCatalog)
      .where(
        or(
          sql`LOWER(${medicationsCatalog.name}) LIKE ${searchTerm}`,
          sql`LOWER(${medicationsCatalog.active_substance}) LIKE ${searchTerm}`
        )
      )
      .limit(15)
      .orderBy(medicationsCatalog.name);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching medications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search medications',
    });
  }
});

/**
 * GET /api/medications/catalog/:id
 * Get single medication from catalog
 */
router.get('/catalog/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid medication ID',
      });
    }

    const [medication] = await db
      .select()
      .from(medicationsCatalog)
      .where(sql`${medicationsCatalog.id} = ${id}`)
      .limit(1);

    if (!medication) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found',
      });
    }

    res.json({
      success: true,
      data: medication,
    });
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medication',
    });
  }
});

/**
 * POST /api/medications
 * Log a medication intake
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const {
      catalog_medication_id,
      custom_name,
      medication_type,
      dosage,
      dosage_unit,
      time_taken,
      notes,
    } = req.body;

    // Validate: must have either catalog_medication_id or custom_name
    if (!catalog_medication_id && !custom_name) {
      return res.status(400).json({
        success: false,
        error: 'Either catalog_medication_id or custom_name is required',
      });
    }

    // Validate time_taken
    if (!time_taken) {
      return res.status(400).json({
        success: false,
        error: 'time_taken is required',
      });
    }

    const [newMedication] = await db
      .insert(userMedications)
      .values({
        user_id: userId,
        catalog_medication_id: catalog_medication_id || null,
        custom_name: custom_name || null,
        medication_type: medication_type || 'mcas',
        dosage: dosage || null,
        dosage_unit: dosage_unit || null,
        time_taken: new Date(time_taken),
        notes: notes || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newMedication,
    });
  } catch (error) {
    console.error('Error logging medication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log medication',
    });
  }
});

/**
 * GET /api/medications
 * Get user's medication history
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { from, to, limit = 50 } = req.query;

    let query = db
      .select({
        id: userMedications.id,
        catalog_medication_id: userMedications.catalog_medication_id,
        custom_name: userMedications.custom_name,
        medication_type: userMedications.medication_type,
        dosage: userMedications.dosage,
        dosage_unit: userMedications.dosage_unit,
        time_taken: userMedications.time_taken,
        notes: userMedications.notes,
        created_at: userMedications.created_at,
        // Join with catalog for full medication info
        catalog_name: medicationsCatalog.name,
        catalog_substance: medicationsCatalog.active_substance,
        catalog_form: medicationsCatalog.form,
        catalog_strength: medicationsCatalog.strength,
      })
      .from(userMedications)
      .leftJoin(
        medicationsCatalog,
        sql`${userMedications.catalog_medication_id} = ${medicationsCatalog.id}`
      )
      .where(sql`${userMedications.user_id} = ${userId}`)
      .orderBy(desc(userMedications.time_taken))
      .limit(parseInt(limit as string, 10));

    // Apply date filters if provided
    if (from) {
      query = query.where(sql`${userMedications.time_taken} >= ${new Date(from as string)}`);
    }
    if (to) {
      query = query.where(sql`${userMedications.time_taken} <= ${new Date(to as string)}`);
    }

    const medications = await query;

    res.json({
      success: true,
      data: medications,
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medications',
    });
  }
});

/**
 * DELETE /api/medications/:id
 * Delete a medication entry
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const medicationId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (isNaN(medicationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid medication ID',
      });
    }

    // Ensure user owns this medication entry
    const [deleted] = await db
      .delete(userMedications)
      .where(
        sql`${userMedications.id} = ${medicationId} AND ${userMedications.user_id} = ${userId}`
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Medication not found or unauthorized',
      });
    }

    res.json({
      success: true,
      message: 'Medication deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete medication',
    });
  }
});

export default router;
