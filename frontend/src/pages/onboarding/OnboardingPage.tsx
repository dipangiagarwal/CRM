import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Briefcase, Users, CheckCircle } from 'lucide-react';
import { organizationsApi } from '../../api/organizations';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education',
  'Retail', 'Manufacturing', 'Real Estate', 'Hospitality',
  'Logistics', 'Media', 'Consulting', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Industry', icon: Briefcase },
  { id: 3, title: 'Team Size', icon: Users },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { org, setOrg } = useAuthStore();
  const { addToast } = useUIStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    company_name: org?.name || '',
    industry: '',
    company_size: '',
  });

  const handleFinish = async () => {
    setLoading(true);
    try {
      await organizationsApi.completeOnboarding({
        company_name: data.company_name || undefined,
        industry: data.industry.toLowerCase().replace(' ', '_') || undefined,
        company_size: data.company_size || undefined,
      });
      const updatedOrg = await organizationsApi.me();
      setOrg(updatedOrg);
      addToast({ type: 'success', title: 'Welcome to Pixel CRM!', message: 'Your workspace is ready.' });
      navigate('/dashboard');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err?.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 ${step >= s.id ? 'text-primary-400' : 'text-text-muted'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border
                  ${step > s.id ? 'bg-primary-500 border-primary-500 text-white' :
                    step === s.id ? 'border-primary-500 text-primary-400' : 'border-surface-border text-text-muted'}`}>
                  {step > s.id ? <CheckCircle size={16} /> : s.id}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${step > s.id ? 'bg-primary-500' : 'bg-surface-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-8">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-1">What's your company name?</h2>
              <p className="text-text-muted text-sm mb-6">This will appear throughout your CRM workspace.</p>
              <input
                className="input-field text-lg"
                placeholder="e.g. Acme Corporation"
                value={data.company_name}
                onChange={(e) => setData({ ...data, company_name: e.target.value })}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-1">What industry are you in?</h2>
              <p className="text-text-muted text-sm mb-6">Helps us tailor your experience.</p>
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setData({ ...data, industry: ind })}
                    className={`p-3 rounded-lg border text-sm font-medium text-left transition-all
                      ${data.industry === ind
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-border hover:border-surface-muted text-text-secondary hover:text-text-primary'}`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-1">How big is your team?</h2>
              <p className="text-text-muted text-sm mb-6">We'll suggest the right plan for you.</p>
              <div className="space-y-2">
                {COMPANY_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setData({ ...data, company_size: size })}
                    className={`w-full p-4 rounded-lg border text-sm font-medium text-left transition-all flex items-center justify-between
                      ${data.company_size === size
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-border hover:border-surface-muted text-text-secondary'}`}
                  >
                    <span>{size} employees</span>
                    {data.company_size === size && <CheckCircle size={16} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : null}
              className={`btn-secondary btn-md ${step === 1 ? 'invisible' : ''}`}
            >
              Back
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary btn-md">
                Continue
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className="btn-primary btn-md">
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? 'Setting up...' : 'Launch workspace 🚀'}
              </button>
            )}
          </div>

          <button
            onClick={handleFinish}
            className="w-full text-center text-xs text-text-muted hover:text-text-secondary mt-4 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
