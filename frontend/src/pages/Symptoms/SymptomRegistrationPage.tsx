import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SymptomRegistrationFlow } from '../../components/Symptoms';

export const SymptomRegistrationPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    // Navigate to symptoms overview or dashboard
    navigate('/symptoms');
  };

  const handleCancel = () => {
    // Navigate back
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Registrer symptom</h1>
          <p className="text-gray-600">
            Følg stegene for å raskt registrere et symptom. Du kan legge til flere detaljer senere.
          </p>
        </div>

        {/* Registration Flow */}
        <SymptomRegistrationFlow onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    </div>
  );
};
