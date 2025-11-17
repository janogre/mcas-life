import React, { useState, useEffect } from 'react';
import { symptomTemplateApi, symptomsApi } from '../../lib/api';

interface FollowUpQuestion {
  id: string;
  question_no: string;
  question_en: string;
  type: 'single_choice' | 'multiple_choice' | 'slider' | 'text' | 'body_map' | 'time_since';
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  required?: boolean;
}

interface SymptomFollowUpFormProps {
  symptomId: number;
  templateId: number;
  onComplete: () => void;
  onSkip: () => void;
}

export const SymptomFollowUpForm: React.FC<SymptomFollowUpFormProps> = ({
  symptomId,
  templateId,
  onComplete,
  onSkip,
}) => {
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symptomName, setSymptomName] = useState<string>('');

  useEffect(() => {
    loadFollowUpQuestions();
  }, [templateId]);

  const loadFollowUpQuestions = async () => {
    try {
      setLoading(true);
      const data = await symptomTemplateApi.getFollowUpQuestions(templateId);
      setQuestions(data.questions || []);
      setSymptomName(data.symptomName || '');
      setError(null);
    } catch (err) {
      console.error('Error loading follow-up questions:', err);
      setError('Kunne ikke laste oppfølgingsspørsmål');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      await symptomsApi.completeFollowUp(symptomId, answers);
      onComplete();
    } catch (err) {
      console.error('Error saving follow-up:', err);
      setError('Kunne ikke lagre svar. Prøv igjen.');
      setSaving(false);
    }
  };

  const renderQuestion = (question: FollowUpQuestion, index: number) => {
    switch (question.type) {
      case 'single_choice':
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-base font-semibold text-gray-900 mb-1">
              {question.question_no}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <p className="text-sm text-gray-500 mb-3">Velg ett alternativ</p>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerChange(question.id, option)}
                  disabled={saving}
                  className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    answers[question.id] === option
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-base font-semibold text-gray-900 mb-1">
              {question.question_no}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <p className="text-sm text-gray-500 mb-3">Du kan velge flere alternativer</p>
            <div className="space-y-2">
              {question.options?.map((option) => {
                const selectedOptions = (answers[question.id] as string[]) || [];
                const isSelected = selectedOptions.includes(option);

                return (
                  <button
                    key={option}
                    onClick={() => {
                      if (isSelected) {
                        handleAnswerChange(
                          question.id,
                          selectedOptions.filter((o) => o !== option)
                        );
                      } else {
                        handleAnswerChange(question.id, [...selectedOptions, option]);
                      }
                    }}
                    disabled={saving}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'slider':
        const value = answers[question.id] ?? (question.min || 0);
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-base font-semibold text-gray-900 mb-1">
              {question.question_no}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <p className="text-sm text-gray-500 mb-3">Bruk slideren til å velge verdi</p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={question.min || 0}
                max={question.max || 10}
                value={value}
                onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                disabled={saving}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <div className="flex items-center gap-1 min-w-[60px]">
                <span className="text-lg font-bold text-gray-900">{value}</span>
                {question.unit && <span className="text-sm text-gray-500">{question.unit}</span>}
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-base font-semibold text-gray-900 mb-1">
              {question.question_no}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <p className="text-sm text-gray-500 mb-3">Skriv ditt svar her</p>
            <textarea
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Skriv ditt svar her..."
            />
          </div>
        );

      case 'time_since':
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-base font-semibold text-gray-900 mb-1">
              {question.question_no}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <p className="text-sm text-gray-500 mb-3">Velg ett alternativ</p>
            <div className="grid grid-cols-3 gap-3">
              {['Nå nettopp', 'Siste time', 'I dag', 'I går', 'Siste uke', 'Lenger siden'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerChange(question.id, option)}
                  disabled={saving}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    answers[question.id] === option
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Oppfølgingsspørsmål: {symptomName}
        </h3>
        <p className="text-sm text-gray-600">
          Disse spørsmålene hjelper oss å forstå symptomet bedre og gi bedre anbefalinger.
        </p>
      </div>

      {/* Questions */}
      {questions.length > 0 ? (
        <div className="space-y-4 mb-6">{questions.map((question, index) => renderQuestion(question, index))}</div>
      ) : (
        <div className="text-center py-8 text-gray-500">Ingen oppfølgingsspørsmål tilgjengelig</div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onSkip}
          disabled={saving}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Hopp over
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || questions.length === 0}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Lagrer...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Fullfør</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
