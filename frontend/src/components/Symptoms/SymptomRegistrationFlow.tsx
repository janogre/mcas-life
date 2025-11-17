import React, { useState } from 'react';
import { SymptomTemplateSelector } from './SymptomTemplateSelector';
import { SymptomQuickCapture } from './SymptomQuickCapture';
import { SymptomFollowUpForm } from './SymptomFollowUpForm';
import { RoomExposureSelector } from './RoomExposureSelector';

interface SymptomTemplate {
  id: number;
  category: string;
  name_no: string;
  name_en: string;
  icon?: string;
  severity_label_low_no: string;
  severity_label_mid_no: string;
  severity_label_high_no: string;
}

interface RoomExposure {
  room_id: string;
  room_name: string;
  time_spent_minutes?: number;
}

type FlowStep = 'select' | 'quick-capture' | 'follow-up' | 'rooms' | 'complete';

interface SymptomRegistrationFlowProps {
  onComplete?: () => void;
  onCancel?: () => void;
  initialStep?: FlowStep;
}

export const SymptomRegistrationFlow: React.FC<SymptomRegistrationFlowProps> = ({
  onComplete,
  onCancel,
  initialStep = 'select',
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>(initialStep);
  const [selectedTemplate, setSelectedTemplate] = useState<SymptomTemplate | null>(null);
  const [symptomId, setSymptomId] = useState<number | null>(null);
  const [roomExposures, setRoomExposures] = useState<RoomExposure[]>([]);

  // Progress tracking
  const steps: { [key in FlowStep]: number } = {
    select: 1,
    'quick-capture': 2,
    'follow-up': 3,
    rooms: 4,
    complete: 5,
  };

  const currentStepNumber = steps[currentStep];
  const totalSteps = 4; // We don't count 'complete'

  // Step 1: Template Selection
  const handleTemplateSelect = (template: SymptomTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep('quick-capture');
  };

  // Step 2: Quick Capture
  const handleQuickCaptureComplete = (newSymptomId: number) => {
    setSymptomId(newSymptomId);
    setCurrentStep('follow-up');
  };

  const handleQuickCaptureCancel = () => {
    setSelectedTemplate(null);
    setCurrentStep('select');
  };

  // Step 3: Follow-up Questions
  const handleFollowUpComplete = () => {
    setCurrentStep('rooms');
  };

  const handleFollowUpSkip = () => {
    setCurrentStep('rooms');
  };

  // Step 4: Room Exposure
  const handleRoomsComplete = (rooms: RoomExposure[]) => {
    setRoomExposures(rooms);
    setCurrentStep('complete');

    // Auto-complete after brief delay
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 1500);
  };

  const handleRoomsSkip = () => {
    setCurrentStep('complete');

    // Auto-complete after brief delay
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 1500);
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'select':
        return <SymptomTemplateSelector onSelect={handleTemplateSelect} />;

      case 'quick-capture':
        return selectedTemplate ? (
          <SymptomQuickCapture
            template={selectedTemplate}
            onComplete={handleQuickCaptureComplete}
            onCancel={handleQuickCaptureCancel}
          />
        ) : null;

      case 'follow-up':
        return selectedTemplate && symptomId ? (
          <SymptomFollowUpForm
            symptomId={symptomId}
            templateId={selectedTemplate.id}
            onComplete={handleFollowUpComplete}
            onSkip={handleFollowUpSkip}
          />
        ) : null;

      case 'rooms':
        return <RoomExposureSelector onComplete={handleRoomsComplete} onSkip={handleRoomsSkip} />;

      case 'complete':
        return (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Symptom registrert!</h3>
              <p className="text-gray-600">
                Takk for at du delte detaljer. Dette hjelper oss gi bedre anbefalinger.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm font-medium text-gray-700 mb-2">Oppsummering:</div>
              <div className="space-y-2 text-sm text-gray-600">
                {selectedTemplate && (
                  <div className="flex items-center gap-2">
                    {selectedTemplate.icon && <span>{selectedTemplate.icon}</span>}
                    <span>{selectedTemplate.name_no}</span>
                  </div>
                )}
                {roomExposures.length > 0 && (
                  <div>
                    Rom: {roomExposures.map((r) => r.room_name).join(', ')}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Du kan se symptomet i oversikten og legge til flere detaljer senere
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      {currentStep !== 'complete' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Steg {currentStepNumber} av {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStepNumber / totalSteps) * 100)}% fullført
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${(currentStepNumber / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Labels */}
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-center">
            <div className={currentStepNumber >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Velg symptom
            </div>
            <div className={currentStepNumber >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Rask fangst
            </div>
            <div className={currentStepNumber >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Detaljer
            </div>
            <div className={currentStepNumber >= 4 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Rom
            </div>
          </div>
        </div>
      )}

      {/* Cancel Button (top right) */}
      {currentStep !== 'complete' && onCancel && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Avbryt</span>
          </button>
        </div>
      )}

      {/* Current Step Content */}
      <div className="animate-fadeIn">{renderStep()}</div>
    </div>
  );
};
