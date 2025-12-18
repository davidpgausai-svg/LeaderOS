import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, X, Check, Clock, RefreshCw } from "lucide-react";

interface BillingInfo {
  currentPlan: string;
  isLegacy: boolean;
  hasActiveSubscription?: boolean;
}

const PRICE_IDS = {
  starter: {
    monthly: 'price_1SdxDMAPmlCUuC3zt16HQ6hR',
  },
  leaderpro: {
    monthly: 'price_1SdxDMAPmlCUuC3zrwwZFojc',
    annual: 'price_1SdxDMAPmlCUuC3z1eidVw7P',
  },
  team: {
    monthly: 'price_1SdxDNAPmlCUuC3zCMeKd0bV',
    annual: 'price_1SdxDNAPmlCUuC3zOcpRsQ3S',
  },
};

export function GlobalUpgradeModal() {
  const { isOpen, triggerReason, limitType, closeModal } = useUpgradeModal();
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: billingInfo } = useQuery<BillingInfo>({
    queryKey: ['/api/billing/info'],
    enabled: isOpen,
  });

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 1,
      annualPrice: 12,
      description: 'For individuals getting started',
      features: [
        { name: 'Strategic priorities', value: '1' },
        { name: 'Projects', value: '4' },
        { name: 'Users', value: '1' },
        { name: 'Basic reporting', value: true },
        { name: 'SME tagging', value: false },
        { name: 'Team collaboration', value: false },
        { name: 'Add extra seats', value: false },
      ],
      trial: false,
    },
    {
      id: 'leaderpro',
      name: 'LeaderPro',
      monthlyPrice: 12,
      annualPrice: 120,
      description: 'For power users who want unlimited access',
      popular: true,
      features: [
        { name: 'Strategic priorities', value: 'Unlimited' },
        { name: 'Projects', value: 'Unlimited' },
        { name: 'Users', value: '1' },
        { name: 'Basic reporting', value: true },
        { name: 'SME tagging', value: true },
        { name: 'Team collaboration', value: false },
        { name: 'Add extra seats', value: false },
      ],
      trial: true,
      trialDays: 14,
    },
    {
      id: 'team',
      name: 'Team',
      monthlyPrice: 22,
      annualPrice: 220,
      description: 'For organizations that collaborate',
      features: [
        { name: 'Strategic priorities', value: 'Unlimited' },
        { name: 'Projects', value: 'Unlimited' },
        { name: 'Users', value: '6 included' },
        { name: 'Basic reporting', value: true },
        { name: 'SME tagging', value: true },
        { name: 'Team collaboration', value: true },
        { name: 'Add extra seats', value: '$6/mo each' },
      ],
      trial: true,
      trialDays: 14,
    },
  ];

  const openCustomerPortal = async () => {
    setIsLoading(true);
    setSelectedPlan('portal');
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to open billing portal');
      }
      
      const { url } = await response.json();
      // Navigate to billing portal - page will unload
      window.location.href = url;
      
      // Reset state after a short delay in case navigation is blocked
      // (popup blockers, SPA constraints, etc.)
      setTimeout(() => {
        setSelectedPlan(null);
        setIsLoading(false);
      }, 3000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
      setSelectedPlan(null);
      setIsLoading(false);
    }
  };

  const createCheckoutSession = async (planId: string, withTrial: boolean = false) => {
    // If user has an active subscription, redirect to billing portal instead
    if (billingInfo?.hasActiveSubscription) {
      await openCustomerPortal();
      return;
    }
    
    setIsLoading(true);
    setSelectedPlan(planId);
    
    try {
      const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
      const plan = plans.find(p => p.id === planId);
      let priceId = '';
      
      if (planId === 'starter') {
        priceId = PRICE_IDS.starter.monthly;
      } else if (planId === 'leaderpro') {
        priceId = billingInterval === 'annual' ? PRICE_IDS.leaderpro.annual : PRICE_IDS.leaderpro.monthly;
      } else if (planId === 'team') {
        priceId = billingInterval === 'annual' ? PRICE_IDS.team.annual : PRICE_IDS.team.monthly;
      }
      
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ 
          priceId, 
          trialDays: withTrial && plan?.trial ? plan.trialDays : 0 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getUpgradeRecommendation = () => {
    if (triggerReason === 'limit_reached') {
      if (limitType === 'priorities' || limitType === 'projects') {
        return 'leaderpro';
      }
      if (limitType === 'users') {
        return 'team';
      }
    }
    const currentPlan = billingInfo?.currentPlan || 'starter';
    if (currentPlan === 'starter') return 'leaderpro';
    if (currentPlan === 'leaderpro') return 'team';
    return null;
  };

  const recommendedPlan = getUpgradeRecommendation();
  const currentPlan = billingInfo?.currentPlan || 'starter';
  const isLegacy = billingInfo?.isLegacy;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-global-upgrade"
      >
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                {triggerReason === 'limit_reached' ? 'Upgrade to Continue' : 'Choose Your Plan'}
              </h2>
              {triggerReason === 'limit_reached' && limitType && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {limitType === 'priorities' && "You've reached your strategic priority limit."}
                  {limitType === 'projects' && "You've reached your project limit."}
                  {limitType === 'users' && "You've reached your user limit."}
                  {' '}Upgrade to unlock more.
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={closeModal} data-testid="button-close-global-upgrade-modal">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 max-w-xs mx-auto">
            <button
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'monthly'
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => setBillingInterval('monthly')}
              data-testid="toggle-global-billing-monthly"
            >
              Monthly
            </button>
            <button
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'annual'
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => setBillingInterval('annual')}
              data-testid="toggle-global-billing-annual"
            >
              Annual
              <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === currentPlan;
              const isRecommended = plan.id === recommendedPlan;
              const isDisabled = isCurrentPlan || (isLegacy && plan.id !== 'team');
              const price = billingInterval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
              const monthlyEquivalent = billingInterval === 'annual' ? (plan.annualPrice / 12).toFixed(2) : plan.monthlyPrice;
              
              return (
                <div
                  key={plan.id}
                  className={`relative p-5 rounded-xl border-2 transition-all ${
                    isRecommended
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                      : isCurrentPlan
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  data-testid={`global-plan-card-${plan.id}`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white px-3">Recommended</Badge>
                    </div>
                  )}
                  {plan.popular && !isRecommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge variant="secondary" className="px-3">Popular</Badge>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge variant="outline" className="bg-white dark:bg-gray-900 px-3">Current Plan</Badge>
                    </div>
                  )}
                  
                  <div className="text-center mb-4 mt-2">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold">${monthlyEquivalent}</span>
                      <span className="text-gray-500">/mo</span>
                      {billingInterval === 'annual' && (
                        <p className="text-xs text-gray-500 mt-1">Billed ${price}/year</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        {feature.value === true ? (
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        ) : feature.value === false ? (
                          <X className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        )}
                        <span className={feature.value === false ? 'text-gray-400' : ''}>
                          {feature.name}
                          {typeof feature.value === 'string' && `: ${feature.value}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    {plan.trial && !isCurrentPlan && !isLegacy && (
                      <Button
                        className="w-full"
                        variant={isRecommended ? 'default' : 'outline'}
                        onClick={() => createCheckoutSession(plan.id, true)}
                        disabled={isLoading || isDisabled}
                        data-testid={`button-global-trial-${plan.id}`}
                      >
                        {isLoading && selectedPlan === plan.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Clock className="w-4 h-4 mr-2" />
                        )}
                        Start {plan.trialDays}-Day Free Trial
                      </Button>
                    )}
                    {!isCurrentPlan && !isLegacy && (
                      <Button
                        className="w-full"
                        variant={plan.trial ? 'ghost' : isRecommended ? 'default' : 'outline'}
                        onClick={() => createCheckoutSession(plan.id, false)}
                        disabled={isLoading || isDisabled}
                        data-testid={`button-global-upgrade-${plan.id}`}
                      >
                        {isLoading && selectedPlan === plan.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {plan.trial ? 'Subscribe Now' : 'Get Started'}
                      </Button>
                    )}
                    {isCurrentPlan && (
                      <Button className="w-full" variant="outline" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    )}
                    {isLegacy && plan.id !== 'team' && (
                      <p className="text-xs text-center text-gray-500">
                        Your legacy plan includes these features
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>All plans include secure data storage and email support.</p>
            <p className="mt-1">Cancel anytime. No long-term commitments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
