import { SymptomTemplateService } from '../services/symptoms/symptomTemplateService.js';

async function testFollowUp() {
  try {
    const service = new SymptomTemplateService();
    const result = await service.getFollowUpQuestions(10); // Leddsmerter

    console.log('\n=== Follow-up Questions for Template 10 (Leddsmerter) ===\n');
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFollowUp();
