import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { symptomTemplates, type SymptomTemplate } from '../../db/schema';

/**
 * Symptom Template Service
 *
 * Manages symptom templates including retrieval, filtering, and follow-up questions.
 * Used by the symptom registration flow to present symptoms and their context-specific
 * follow-up questions to users.
 */

export class SymptomTemplateService {
  /**
   * Get all active symptom templates, ordered by display_order
   */
  async getAllSymptomTemplates(): Promise<SymptomTemplate[]> {
    try {
      const templates = await db
        .select()
        .from(symptomTemplates)
        .where(eq(symptomTemplates.is_active, true))
        .orderBy(symptomTemplates.display_order, symptomTemplates.name_no);

      return templates;
    } catch (error) {
      console.error('Error fetching all symptom templates:', error);
      throw new Error('Failed to fetch symptom templates');
    }
  }

  /**
   * Get symptom templates filtered by category
   */
  async getSymptomsByCategory(
    category: 'skin' | 'digestive' | 'respiratory' | 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'genitourinary' | 'systemic'
  ): Promise<SymptomTemplate[]> {
    try {
      const templates = await db
        .select()
        .from(symptomTemplates)
        .where(
          and(
            eq(symptomTemplates.category, category),
            eq(symptomTemplates.is_active, true)
          )
        )
        .orderBy(symptomTemplates.display_order, symptomTemplates.name_no);

      return templates;
    } catch (error) {
      console.error(`Error fetching symptom templates for category ${category}:`, error);
      throw new Error(`Failed to fetch symptom templates for category: ${category}`);
    }
  }

  /**
   * Get a single symptom template by ID with all details
   */
  async getSymptomTemplate(id: number): Promise<SymptomTemplate | null> {
    try {
      const template = await db
        .select()
        .from(symptomTemplates)
        .where(eq(symptomTemplates.id, id))
        .limit(1);

      return template[0] || null;
    } catch (error) {
      console.error(`Error fetching symptom template ${id}:`, error);
      throw new Error(`Failed to fetch symptom template: ${id}`);
    }
  }

  /**
   * Get follow-up questions for a specific symptom template
   */
  async getFollowUpQuestions(templateId: number): Promise<{
    symptomName: string;
    category: string;
    severityLabels: {
      low: string;
      mid: string;
      high: string;
    };
    commonBodyRegions?: string[];
    questions: Array<{
      id: string;
      question_no: string;
      question_en: string;
      type: 'single_choice' | 'multiple_choice' | 'slider' | 'text' | 'body_map' | 'time_since';
      options?: string[];
      min?: number;
      max?: number;
      unit?: string;
      required?: boolean;
    }>;
  } | null> {
    try {
      const template = await this.getSymptomTemplate(templateId);

      if (!template) {
        return null;
      }

      // Map questions to ensure snake_case for frontend compatibility
      const questions = (template.follow_up_questions || []).map((q: any) => ({
        id: q.id,
        question_no: q.questionNo || q.question_no,
        question_en: q.questionEn || q.question_en,
        type: q.type,
        options: q.options,
        min: q.min,
        max: q.max,
        unit: q.unit,
        required: q.required,
      }));

      return {
        symptomName: template.name_no,
        category: template.category,
        severityLabels: {
          low: template.severity_label_low_no,
          mid: template.severity_label_mid_no,
          high: template.severity_label_high_no,
        },
        commonBodyRegions: template.common_body_regions,
        questions,
      };
    } catch (error) {
      console.error(`Error fetching follow-up questions for template ${templateId}:`, error);
      throw new Error(`Failed to fetch follow-up questions for template: ${templateId}`);
    }
  }

  /**
   * Get symptom metadata (severity labels, body regions, icon, etc.)
   */
  async getSymptomMetadata(symptomId: number): Promise<{
    id: number;
    name_no: string;
    name_en: string;
    category: string;
    icon?: string;
    severityLabels: {
      low: string;
      mid: string;
      high: string;
    };
    commonBodyRegions?: string[];
  } | null> {
    try {
      const template = await this.getSymptomTemplate(symptomId);

      if (!template) {
        return null;
      }

      return {
        id: template.id,
        name_no: template.name_no,
        name_en: template.name_en,
        category: template.category,
        icon: template.icon || undefined,
        severityLabels: {
          low: template.severity_label_low_no,
          mid: template.severity_label_mid_no,
          high: template.severity_label_high_no,
        },
        commonBodyRegions: template.common_body_regions,
      };
    } catch (error) {
      console.error(`Error fetching symptom metadata for ${symptomId}:`, error);
      throw new Error(`Failed to fetch symptom metadata: ${symptomId}`);
    }
  }

  /**
   * Get symptoms grouped by category
   */
  async getSymptomsGroupedByCategory(): Promise<{
    [category: string]: SymptomTemplate[];
  }> {
    try {
      const allTemplates = await this.getAllSymptomTemplates();

      const grouped = allTemplates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {} as { [category: string]: SymptomTemplate[] });

      return grouped;
    } catch (error) {
      console.error('Error grouping symptoms by category:', error);
      throw new Error('Failed to group symptoms by category');
    }
  }

  /**
   * Search symptom templates by name (Norwegian or English)
   */
  async searchSymptoms(query: string): Promise<SymptomTemplate[]> {
    try {
      const allTemplates = await this.getAllSymptomTemplates();

      const lowerQuery = query.toLowerCase();
      const filtered = allTemplates.filter(template =>
        template.name_no.toLowerCase().includes(lowerQuery) ||
        template.name_en.toLowerCase().includes(lowerQuery)
      );

      return filtered;
    } catch (error) {
      console.error(`Error searching symptoms with query "${query}":`, error);
      throw new Error('Failed to search symptoms');
    }
  }
}

// Export singleton instance
export const symptomTemplateService = new SymptomTemplateService();
