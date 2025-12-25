import { Router, Request, Response } from 'express';
import { db } from '../db';
import { illnessEntries } from '../db/schema';
import { authenticateToken } from '../services/auth/authMiddleware';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/illness
 * Log a new illness entry
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const {
      illness_type,
      custom_illness_name,
      status,
      symptoms,
      severity,
      has_fever,
      temperature_celsius,
      first_symptoms_at,
      became_sick_at,
      recovered_at,
      mcas_flare_during_illness,
      mcas_severity_increase,
      treatments_taken,
      suspected_source,
      notes,
    } = req.body;

    // Validate required fields
    if (!illness_type || !first_symptoms_at || severity === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['illness_type', 'first_symptoms_at', 'severity']
      });
      return;
    }

    // Validate illness_type
    const validIllnessTypes = ['cold', 'flu', 'infection', 'stomach_bug', 'fever', 'other'];
    if (!validIllnessTypes.includes(illness_type)) {
      res.status(400).json({
        error: 'Invalid illness_type',
        valid: validIllnessTypes
      });
      return;
    }

    // Validate severity
    if (severity < 1 || severity > 10) {
      res.status(400).json({
        error: 'Severity must be between 1 and 10'
      });
      return;
    }

    const [newIllness] = await db
      .insert(illnessEntries)
      .values({
        user_id: userId,
        illness_type,
        custom_illness_name,
        status: status || 'incubating',
        symptoms,
        severity,
        has_fever: has_fever || false,
        temperature_celsius,
        first_symptoms_at: new Date(first_symptoms_at),
        became_sick_at: became_sick_at ? new Date(became_sick_at) : null,
        recovered_at: recovered_at ? new Date(recovered_at) : null,
        mcas_flare_during_illness: mcas_flare_during_illness || false,
        mcas_severity_increase,
        treatments_taken,
        suspected_source,
        notes,
      })
      .returning();

    res.status(201).json({
      message: 'Illness entry logged successfully',
      data: newIllness,
    });
  } catch (error) {
    console.error('Error logging illness:', error);
    res.status(500).json({ error: 'Failed to log illness' });
  }
});

/**
 * GET /api/illness
 * Get all illness entries for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { limit = '50', offset = '0', status } = req.query;

    let query = db
      .select()
      .from(illnessEntries)
      .where(eq(illnessEntries.user_id, userId))
      .orderBy(desc(illnessEntries.first_symptoms_at))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Filter by status if specified
    if (status && typeof status === 'string') {
      query = db
        .select()
        .from(illnessEntries)
        .where(
          and(
            eq(illnessEntries.user_id, userId),
            eq(illnessEntries.status, status as any)
          )
        )
        .orderBy(desc(illnessEntries.first_symptoms_at))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
    }

    const illnesses = await query;

    res.json({
      data: illnesses,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: illnesses.length,
      },
    });
  } catch (error) {
    console.error('Error fetching illnesses:', error);
    res.status(500).json({ error: 'Failed to fetch illnesses' });
  }
});

/**
 * GET /api/illness/:id
 * Get a specific illness entry
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const illnessId = parseInt(req.params.id);
    if (isNaN(illnessId)) {
      res.status(400).json({ error: 'Invalid illness ID' });
      return;
    }

    const [illness] = await db
      .select()
      .from(illnessEntries)
      .where(
        and(
          eq(illnessEntries.id, illnessId),
          eq(illnessEntries.user_id, userId)
        )
      );

    if (!illness) {
      res.status(404).json({ error: 'Illness entry not found' });
      return;
    }

    res.json({ data: illness });
  } catch (error) {
    console.error('Error fetching illness:', error);
    res.status(500).json({ error: 'Failed to fetch illness' });
  }
});

/**
 * PATCH /api/illness/:id
 * Update an illness entry (e.g., change status to 'recovering' or 'resolved')
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const illnessId = parseInt(req.params.id);
    if (isNaN(illnessId)) {
      res.status(400).json({ error: 'Invalid illness ID' });
      return;
    }

    const updateData = req.body;

    const [updatedIllness] = await db
      .update(illnessEntries)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(illnessEntries.id, illnessId),
          eq(illnessEntries.user_id, userId)
        )
      )
      .returning();

    if (!updatedIllness) {
      res.status(404).json({ error: 'Illness entry not found' });
      return;
    }

    res.json({
      message: 'Illness entry updated successfully',
      data: updatedIllness
    });
  } catch (error) {
    console.error('Error updating illness:', error);
    res.status(500).json({ error: 'Failed to update illness' });
  }
});

/**
 * DELETE /api/illness/:id
 * Delete an illness entry
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const illnessId = parseInt(req.params.id);
    if (isNaN(illnessId)) {
      res.status(400).json({ error: 'Invalid illness ID' });
      return;
    }

    const [deletedIllness] = await db
      .delete(illnessEntries)
      .where(
        and(
          eq(illnessEntries.id, illnessId),
          eq(illnessEntries.user_id, userId)
        )
      )
      .returning();

    if (!deletedIllness) {
      res.status(404).json({ error: 'Illness entry not found' });
      return;
    }

    res.json({
      message: 'Illness entry deleted successfully',
      data: deletedIllness
    });
  } catch (error) {
    console.error('Error deleting illness:', error);
    res.status(500).json({ error: 'Failed to delete illness' });
  }
});

export default router;
