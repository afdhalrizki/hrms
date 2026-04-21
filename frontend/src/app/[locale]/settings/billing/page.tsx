'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenant } from '@/context/TenantContext';
import { apiFetch } from '@/lib/api';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Building2, 
  Calendar,
  Lock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free Tier',
    price: 0,
    features: ['10 Employees', '100MB Storage', 'Basic Attendance', 'Core HR'],
    icon: Building2,
    color: 'bg-slate-500/10 text-slate-500'
  },
  {
    id: 'ESSENTIAL',
    name: 'Essential HR',
    price: 250000,
    features: ['50 Employees', '100MB Storage', 'Geofence Attendance', 'Leaves Management'],
    icon: Building2,
    color: 'bg-blue-500/10 text-blue-500'
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 750000,
    features: ['100 Employees', '2GB Storage', 'Indonesian Payroll', 'BPJS & PPh 21'],
    icon: Zap,
    color: 'bg-primary/10 text-primary',
    popular: true
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 1500000,
    features: ['500 Employees', '5GB Storage', 'Performance Management', 'Advanced Analytics'],
    icon: ShieldCheck,
    color: 'bg-purple-500/10 text-purple-500'
  }
];

const ADDON_PRICES: Record<string, number> = {
  ESSENTIAL: 50000,
  PROFESSIONAL: 100000,
  PREMIUM: 150000
};

export default function BillingPage() {
  const { planType, expiryDate, subscriptionStatus } = useTenant();
  const [selectedPlan, setSelectedPlan] = useState(planType || 'PROFESSIONAL');
  const [months, setMonths] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddonMode, setIsAddonMode] = useState(false);
  const [addonCategory, setAddonCategory] = useState<'EMPLOYEE' | 'STORAGE'>('EMPLOYEE');
  const [addonCount, setAddonCount] = useState(10);
  const [storageGb, setStorageGb] = useState(1);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const payload = isAddonMode 
        ? (addonCategory === 'EMPLOYEE' 
            ? { plan_type: planType || 'ESSENTIAL', is_addon: true, addon_count: addonCount }
            : { plan_type: planType || 'ESSENTIAL', is_storage_addon: true, storage_gb: storageGb })
        : { plan_type: selectedPlan, months: months };

      const res = await apiFetch('/billing/checkout/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.snap_token) {
        // @ts-ignore
        if (window.snap) {
          // @ts-ignore
          window.snap.pay(res.snap_token, {
            onSuccess: function(result: any) {
              toast.success('Payment successful! Your account will be updated shortly.');
              setTimeout(() => window.location.reload(), 2000);
            },
            onPending: function(result: any) {
              toast.info('Waiting for your payment...');
              setIsProcessing(false);
            },
            onError: function(result: any) {
               toast.error('Payment failed. Please try again.');
               setIsProcessing(false);
            },
            onClose: function() {
               toast.info('Payment window closed.');
               setIsProcessing(false);
            }
          });
        } else {
          toast.error('Payment SDK not loaded. Please refresh.');
          setIsProcessing(false);
        }
      } else {
         throw new Error(res.error || 'Checkout failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate checkout');
      setIsProcessing(false);
    }
  };

  const currentPlanDetails = PLANS.find(p => p.id === (isAddonMode ? planType : selectedPlan)) || PLANS[2];
  
  const STORAGE_GB_PRICE = 50000;
  const employeeAddonCost = (ADDON_PRICES[planType || 'ESSENTIAL'] || 0) * (addonCount / 10);
  const storageAddonCost = storageGb * STORAGE_GB_PRICE;
  const addonCost = addonCategory === 'EMPLOYEE' ? employeeAddonCost : storageAddonCost;

  const subtotalAmount = months === 12 
    ? (currentPlanDetails.price * 12) 
    : (currentPlanDetails.price * months);
  
  const discount = months === 12 ? subtotalAmount * 0.2 : 0; // 20% discount for annual
  const totalAmount = isAddonMode ? addonCost : (subtotalAmount - discount);

  return (
    <DashboardLayout>
      <Script 
        src="https://app.sandbox.midtrans.com/snap/snap.js" 
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} 
        strategy="lazyOnload"
      />
      
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 pt-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Subscription & Billing</h1>
            <p className="text-muted-foreground max-w-lg">
              Empower your workforce with harikerja. Professional plans include full ID compliance.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl shadow-sm">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Plan Ends</p>
              <p className="font-bold text-lg">{expiryDate || 'N/A'}</p>
            </div>
          </div>
        </header>

        {/* Current Plan Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-primary/5"
        >
           <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40">
                <Building2 size={40} />
              </div>
              <div className="space-y-1">
                 <h2 className="text-2xl font-bold flex items-center gap-2">
                   {planType || 'Trial'} Plan
                   <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-tighter ${subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                     {subscriptionStatus || 'TRIAL'}
                   </span>
                 </h2>
                 <p className="text-muted-foreground text-sm max-w-md">
                   Secure and reliable infrastructure powering your {planType?.toLowerCase() || 'trial'} workspace.
                 </p>
              </div>
           </div>
           <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsAddonMode(!isAddonMode)}
                className={`px-6 py-3 rounded-2xl font-bold transition-all text-sm flex items-center gap-2 ${isAddonMode ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
              >
                <Zap size={16} />
                {isAddonMode ? 'Close Add-on Menu' : 'Buy More Quota'}
              </button>
              <button className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all text-sm">
                View Invoices
              </button>
           </div>
        </motion.div>

        {isAddonMode ? (
          /* Add-on Mode UI */
          <div className="space-y-8 px-4 max-w-3xl mx-auto">
             <div className="text-center space-y-2">
               <h3 className="text-2xl font-bold">Elastic Quota: Add Employees</h3>
               <p className="text-muted-foreground">Expand your capacity without upgrading your plan features.</p>
             </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-8">
                {/* Category Selection */}
                <div className="flex justify-center p-1 bg-black/20 rounded-2xl w-fit mx-auto">
                   <button 
                      onClick={() => setAddonCategory('EMPLOYEE')}
                      className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${addonCategory === 'EMPLOYEE' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}
                   >
                      Employees
                   </button>
                   <button 
                      onClick={() => setAddonCategory('STORAGE')}
                      className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${addonCategory === 'STORAGE' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}
                   >
                      Storage
                   </button>
                </div>

                {addonCategory === 'EMPLOYEE' ? (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {[10, 20, 50, 100].map(count => (
                      <button
                          key={count}
                          onClick={() => setAddonCount(count)}
                          className={`px-8 py-4 rounded-2xl font-bold transition-all text-lg ${addonCount === count ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                      >
                          +{count}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {[1, 5, 10, 20].map(gb => (
                      <button
                          key={gb}
                          onClick={() => setStorageGb(gb)}
                          className={`px-8 py-4 rounded-2xl font-bold transition-all text-lg ${storageGb === gb ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                      >
                          +{gb} GB
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 text-center">
                   <p className="text-sm text-muted-foreground mb-1 uppercase tracking-widest font-bold">Add-on Special Price</p>
                   <p className="text-3xl font-black text-primary">Rp {addonCost.toLocaleString()}</p>
                   <p className="text-xs text-muted-foreground mt-2 italic">
                     {addonCategory === 'EMPLOYEE' 
                       ? `Based on your ${planType} plan rate (Rp ${(ADDON_PRICES[planType || 'ESSENTIAL'] || 0).toLocaleString()} per 10 employees)`
                       : `Flat rate Rp ${STORAGE_GB_PRICE.toLocaleString()} per 1 GB`}
                   </p>
                </div>
             </div>
          </div>
        ) : (
          /* Standard Plan Selection */
          <div className="space-y-8 px-4">
             <div className="text-center space-y-2">
               <h3 className="text-2xl font-bold">Select Your Power Level</h3>
               <p className="text-muted-foreground">Scale from micro-SME to huge enterprise with a few clicks.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PLANS.map((plan, idx) => (
                  <motion.div 
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => plan.price > 0 && setSelectedPlan(plan.id)}
                    className={`relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all group ${plan.price > 0 ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'} ${selectedPlan === plan.id ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}
                  >
                    {plan.popular && (
                       <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Best Seller
                       </div>
                    )}

                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ${plan.color}`}>
                      <plan.icon size={28} />
                    </div>

                    <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-3xl font-black">{plan.price === 0 ? 'FREE' : `Rp ${(plan.price / 1000).toLocaleString()}k`}</span>
                      {plan.price > 0 && <span className="text-muted-foreground text-sm font-medium">/mo</span>}
                    </div>

                    <ul className="space-y-4 mb-8 flex-grow">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 size={16} className={selectedPlan === plan.id ? 'text-primary' : 'text-muted-foreground/40'} />
                          <span className={selectedPlan === plan.id ? 'text-foreground font-medium' : 'text-muted-foreground'}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {plan.price > 0 && (
                      <div className={`mt-auto h-2 w-2 rounded-full mx-auto transition-all ${selectedPlan === plan.id ? 'bg-primary scale-150' : 'bg-transparent'}`} />
                    )}
                  </motion.div>
                ))}
             </div>
          </div>
        )}

        {/* Calculation & Checkout Row */}
        {!(!isAddonMode && selectedPlan === 'FREE') && (
          <div className="px-4">
             <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto glass-card rounded-[2.5rem] p-8 md:p-12 border border-white/10 space-y-10 shadow-2xl"
             >
                {!isAddonMode && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <span className="font-bold text-xl block mb-1">Billing Frequency</span>
                      <p className="text-sm text-muted-foreground">Unlock 20% annual loyalty discount.</p>
                    </div>
                    <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                        <button 
                          onClick={() => setMonths(1)}
                          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${months === 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                          Monthly
                        </button>
                        <button 
                          onClick={() => setMonths(12)}
                          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${months === 12 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                          Annual
                          <span className="bg-emerald-500 text-[10px] px-2 py-0.5 rounded-lg text-white font-black animate-pulse">SAVE 20%</span>
                        </button>
                    </div>
                  </div>
                )}

                <div className="space-y-5 border-t border-white/5 pt-10">
                   <div className="flex items-center justify-between text-base">
                      <span className="text-muted-foreground">{isAddonMode ? 'Quota Purchase' : `Plan Rate (${currentPlanDetails.name})`}</span>
                      <span className="font-semibold">
                        {isAddonMode ? `+${addonCount} Employees` : `Rp ${currentPlanDetails.price.toLocaleString()} \u00D7 ${months} mo`}
                      </span>
                   </div>
                   {!isAddonMode && months === 12 && (
                     <div className="flex items-center justify-between text-base text-emerald-500">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          Annual Loyalty Reward (20% Off)
                        </span>
                        <span className="font-bold">- Rp {discount.toLocaleString()}</span>
                     </div>
                   )}
                   <div className="flex items-center justify-between text-3xl font-black py-4 border-t border-white/5">
                      <span>Total Invoice</span>
                      <span className="text-primary tracking-tighter">Rp {totalAmount.toLocaleString()}</span>
                   </div>
                </div>

                <div className="space-y-6">
                  <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-primary text-white py-6 rounded-[1.8rem] font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={28} />
                    ) : (
                      <>
                        <CreditCard size={28} />
                        Confirm & Pay Securely
                        <ArrowRight size={24} />
                      </>
                    )}
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-muted-foreground">
                     <div className="flex items-center gap-2 grayscale opacity-50">
                       <Lock size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">PCI DSS Standard</span>
                     </div>
                     <div className="hidden sm:block h-1 w-1 bg-white/20 rounded-full" />
                     <div className="flex items-center gap-2 grayscale opacity-50">
                       <ShieldCheck size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Powered by Midtrans Snap</span>
                     </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
