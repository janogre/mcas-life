import { Router, Request, Response } from 'express';
import { db } from '../db';
import { mealEntries, mealFoods, foods } from '../db/schema';
import { authenticateToken } from '../services/auth/authMiddleware';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/meals
 * Log a new meal with multiple foods
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const {
      meal_type,
      foods: mealFoodsList,
      meal_time,
      dao_taken_before,
      dao_minutes_before,
      immediate_reaction,
      delayed_reaction,
      reaction_severity,
      reaction_notes,
      location,
      notes,
    } = req.body;

    // Validate required fields
    if (!meal_type || !meal_time || !mealFoodsList || !Array.isArray(mealFoodsList)) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['meal_type', 'meal_time', 'foods (array)']
      });
      return;
    }

    // Validate meal_type
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(meal_type)) {
      res.status(400).json({
        error: 'Invalid meal_type',
        valid: validMealTypes
      });
      return;
    }

    // Validate foods array
    if (mealFoodsList.length === 0) {
      res.status(400).json({ error: 'At least one food item is required' });
      return;
    }

    // Validate each food item
    for (const food of mealFoodsList) {
      if (!food.food_id || !food.amount || !food.unit) {
        res.status(400).json({
          error: 'Each food must have food_id, amount, and unit',
          invalid_food: food
        });
        return;
      }
    }

    // Create meal entry
    const [newMeal] = await db
      .insert(mealEntries)
      .values({
        user_id: userId,
        meal_type,
        meal_time: new Date(meal_time),
        dao_taken_before: dao_taken_before || false,
        dao_minutes_before,
        immediate_reaction: immediate_reaction || false,
        delayed_reaction: delayed_reaction || false,
        reaction_severity,
        reaction_notes,
        location,
        notes,
      })
      .returning();

    // Create meal-food associations
    const mealFoodsData = mealFoodsList.map((food: any) => ({
      meal_id: newMeal.id,
      food_id: food.food_id,
      amount: parseFloat(food.amount),
      unit: food.unit,
      custom_food_name: food.custom_food_name,
    }));

    const createdMealFoods = await db
      .insert(mealFoods)
      .values(mealFoodsData)
      .returning();

    res.status(201).json({
      message: 'Meal logged successfully',
      data: {
        meal: newMeal,
        foods: createdMealFoods,
      },
    });
  } catch (error) {
    console.error('Error logging meal:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

/**
 * GET /api/meals
 * Get all meals for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { limit = '50', offset = '0', meal_type } = req.query;

    let query = db
      .select()
      .from(mealEntries)
      .where(eq(mealEntries.user_id, userId))
      .orderBy(desc(mealEntries.meal_time))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Filter by meal_type if specified
    if (meal_type && typeof meal_type === 'string') {
      query = db
        .select()
        .from(mealEntries)
        .where(
          and(
            eq(mealEntries.user_id, userId),
            eq(mealEntries.meal_type, meal_type as any)
          )
        )
        .orderBy(desc(mealEntries.meal_time))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
    }

    const meals = await query;

    res.json({
      data: meals,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: meals.length,
      },
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

/**
 * GET /api/meals/:id
 * Get a specific meal with all its foods
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const mealId = parseInt(req.params.id);
    if (isNaN(mealId)) {
      res.status(400).json({ error: 'Invalid meal ID' });
      return;
    }

    // Get meal entry
    const [meal] = await db
      .select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.id, mealId),
          eq(mealEntries.user_id, userId)
        )
      );

    if (!meal) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }

    // Get all foods for this meal with their details
    const mealFoodsWithDetails = await db
      .select({
        meal_food_id: mealFoods.id,
        food_id: mealFoods.food_id,
        amount: mealFoods.amount,
        unit: mealFoods.unit,
        custom_food_name: mealFoods.custom_food_name,
        food_name: foods.name,
        compatibility: foods.compatibility,
        category: foods.category,
        histamine_level: foods.histamine_level,
      })
      .from(mealFoods)
      .leftJoin(foods, eq(mealFoods.food_id, foods.id))
      .where(eq(mealFoods.meal_id, mealId));

    res.json({
      data: {
        meal,
        foods: mealFoodsWithDetails,
      },
    });
  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).json({ error: 'Failed to fetch meal' });
  }
});

/**
 * PATCH /api/meals/:id
 * Update a meal entry (e.g., add reaction information)
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const mealId = parseInt(req.params.id);
    if (isNaN(mealId)) {
      res.status(400).json({ error: 'Invalid meal ID' });
      return;
    }

    const updateData = req.body;

    const [updatedMeal] = await db
      .update(mealEntries)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(mealEntries.id, mealId),
          eq(mealEntries.user_id, userId)
        )
      )
      .returning();

    if (!updatedMeal) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }

    res.json({
      message: 'Meal updated successfully',
      data: updatedMeal
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

/**
 * DELETE /api/meals/:id
 * Delete a meal entry (cascade deletes meal_foods)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const mealId = parseInt(req.params.id);
    if (isNaN(mealId)) {
      res.status(400).json({ error: 'Invalid meal ID' });
      return;
    }

    const [deletedMeal] = await db
      .delete(mealEntries)
      .where(
        and(
          eq(mealEntries.id, mealId),
          eq(mealEntries.user_id, userId)
        )
      )
      .returning();

    if (!deletedMeal) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }

    res.json({
      message: 'Meal deleted successfully',
      data: deletedMeal
    });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

export default router;
