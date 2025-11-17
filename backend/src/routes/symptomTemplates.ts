import { Router, Request, Response } from 'express';
import { symptomTemplateService } from '../services/symptoms/symptomTemplateService';
import { authenticateToken } from '../services/auth/index.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/symptom-templates
 * Get all active symptom templates
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const templates = await symptomTemplateService.getAllSymptomTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error in GET /symptom-templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symptom templates',
    });
  }
});

/**
 * GET /api/symptom-templates/grouped
 * Get symptom templates grouped by category
 */
router.get('/grouped', async (req: Request, res: Response) => {
  try {
    const grouped = await symptomTemplateService.getSymptomsGroupedByCategory();

    res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error('Error in GET /symptom-templates/grouped:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grouped symptom templates',
    });
  }
});

/**
 * GET /api/symptom-templates/category/:category
 * Get symptom templates by category
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const validCategories = [
      'skin',
      'digestive',
      'respiratory',
      'cardiovascular',
      'neurological',
      'musculoskeletal',
      'genitourinary',
      'systemic',
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const templates = await symptomTemplateService.getSymptomsByCategory(
      category as any
    );

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error(`Error in GET /symptom-templates/category/${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symptom templates by category',
    });
  }
});

/**
 * GET /api/symptom-templates/search?q=query
 * Search symptom templates by name
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const templates = await symptomTemplateService.searchSymptoms(query);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error(`Error in GET /symptom-templates/search?q=${req.query.q}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to search symptom templates',
    });
  }
});

/**
 * GET /api/symptom-templates/:id
 * Get a single symptom template by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID',
      });
    }

    const template = await symptomTemplateService.getSymptomTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Symptom template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error(`Error in GET /symptom-templates/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symptom template',
    });
  }
});

/**
 * GET /api/symptom-templates/:id/follow-up
 * Get follow-up questions for a symptom template
 */
router.get('/:id/follow-up', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID',
      });
    }

    const followUp = await symptomTemplateService.getFollowUpQuestions(id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Symptom template not found',
      });
    }

    res.json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    console.error(`Error in GET /symptom-templates/${req.params.id}/follow-up:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch follow-up questions',
    });
  }
});

/**
 * GET /api/symptom-templates/:id/metadata
 * Get metadata for a symptom template
 */
router.get('/:id/metadata', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID',
      });
    }

    const metadata = await symptomTemplateService.getSymptomMetadata(id);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Symptom template not found',
      });
    }

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error(`Error in GET /symptom-templates/${req.params.id}/metadata:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symptom metadata',
    });
  }
});

export default router;
