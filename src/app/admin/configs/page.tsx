'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { Settings, Save, Edit, RefreshCw, X, BadgeDollarSign, ShieldCheck } from 'lucide-react';
import type { ApiResponse } from '@/types/api';
import { tournamentsApi } from '@/features/tournaments/api';

interface SystemConfig {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

const DEFAULT_ENTRY_FEE_POLICY_KEY = 'ALLOW_TOURNAMENT_ENTRY_FEES';
const PAYMENT_SANDBOX_CONFIG_KEY = 'PAYMENT_SANDBOX_ENABLED';
const PLATFORM_FEE_THRESHOLD_KEY = 'PLATFORM_FEE_LOW_ENTRY_THRESHOLD';
const PLATFORM_FEE_FIXED_AMOUNT_KEY = 'PLATFORM_FEE_LOW_ENTRY_FIXED_AMOUNT';
const FEE_RULE_CONFIG_KEYS = [
  PLATFORM_FEE_THRESHOLD_KEY,
  PLATFORM_FEE_FIXED_AMOUNT_KEY,
] as const;

export default function ConfigsPage() {
  const translate = useTranslations('AdminConfigs');
  const locale = useLocale();
  const numberLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const formatVndConfig = (value: string) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0
      ? parsed.toLocaleString(numberLocale)
      : value;
  };
  const defaultEntryFeePolicy = useMemo<SystemConfig>(() => ({
    key: DEFAULT_ENTRY_FEE_POLICY_KEY,
    value: 'true',
    description: translate('entryFeePolicyDescription'),
    updatedAt: '',
  }), [translate]);
  const defaultSandboxConfig = useMemo<SystemConfig>(() => ({
    key: PAYMENT_SANDBOX_CONFIG_KEY,
    value: 'false',
    description: translate('sandboxDescription'),
    updatedAt: '',
  }), [translate]);
  const defaultPlatformFeeConfigs = useMemo<Record<(typeof FEE_RULE_CONFIG_KEYS)[number], SystemConfig>>(() => ({
    [PLATFORM_FEE_THRESHOLD_KEY]: {
      key: PLATFORM_FEE_THRESHOLD_KEY,
      value: '100000',
      description: translate('platformFeeThresholdDescription'),
      updatedAt: '',
    },
    [PLATFORM_FEE_FIXED_AMOUNT_KEY]: {
      key: PLATFORM_FEE_FIXED_AMOUNT_KEY,
      value: '5000',
      description: translate('platformFeeFixedAmountDescription'),
      updatedAt: '',
    },
  }), [translate]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const entryFeePolicy =
    configs.find((config) => config.key === DEFAULT_ENTRY_FEE_POLICY_KEY) ??
    defaultEntryFeePolicy;
  const sandboxConfig =
    configs.find((config) => config.key === PAYMENT_SANDBOX_CONFIG_KEY) ??
    defaultSandboxConfig;
  const platformFeeThresholdConfig =
    configs.find((config) => config.key === PLATFORM_FEE_THRESHOLD_KEY) ??
    defaultPlatformFeeConfigs[PLATFORM_FEE_THRESHOLD_KEY];
  const platformFeeFixedAmountConfig =
    configs.find((config) => config.key === PLATFORM_FEE_FIXED_AMOUNT_KEY) ??
    defaultPlatformFeeConfigs[PLATFORM_FEE_FIXED_AMOUNT_KEY];
  const getConfigScope = (key: string) => {
    if (key.startsWith('TOURNAMENT_PUBLISH_FEE_')) return translate('scopePublishFee');
    if (key.startsWith('PLATFORM_FEE_PERCENTAGE_')) return translate('scopePlatformFee');
    if (FEE_RULE_CONFIG_KEYS.includes(key as (typeof FEE_RULE_CONFIG_KEYS)[number])) {
      return translate('scopeFeeRule');
    }
    return translate('scopeSystem');
  };

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<ApiResponse<SystemConfig[]>>('/admin/configs');
      const loadedConfigs = response.data || [];

      const feesResponse = loadedConfigs.some((config) => config.key === DEFAULT_ENTRY_FEE_POLICY_KEY)
        ? null
        : await tournamentsApi.getFeesConfig().catch(() => null);
      const withEntryFeePolicy = loadedConfigs.some((config) => config.key === DEFAULT_ENTRY_FEE_POLICY_KEY)
        ? loadedConfigs
        : [
            ...loadedConfigs,
            {
              ...defaultEntryFeePolicy,
              value: feesResponse?.data?.allowEntryFees === false ? 'false' : 'true',
            },
          ];
      const withSandbox = withEntryFeePolicy.some(
        (config) => config.key === PAYMENT_SANDBOX_CONFIG_KEY,
      )
        ? withEntryFeePolicy
        : [...withEntryFeePolicy, defaultSandboxConfig];
      const withFeeRules = FEE_RULE_CONFIG_KEYS.reduce<SystemConfig[]>(
        (currentConfigs, key) =>
          currentConfigs.some((config) => config.key === key)
            ? currentConfigs
            : [...currentConfigs, defaultPlatformFeeConfigs[key]],
        withSandbox,
      );
      setConfigs(withFeeRules);
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('loadError'));
    } finally {
      setLoading(false);
    }
  }, [defaultEntryFeePolicy, defaultSandboxConfig, defaultPlatformFeeConfigs, translate]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchConfigs();
    });
  }, [fetchConfigs]);

  const handleEdit = (config: SystemConfig) => {
    setSelectedConfig(config);
    setEditValue(config.value);
    setEditDesc(config.description || '');
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedConfig || !editValue.trim()) {
      toast.error(translate('emptyValue'));
      return;
    }
    setProcessing(true);
    try {
      await api.put<ApiResponse<SystemConfig>>(`/admin/configs/${selectedConfig.key}`, {
        value: editValue.trim(),
        description: editDesc.trim(),
      });
      toast.success(translate('updateSuccess'));
      setShowEditModal(false);
      fetchConfigs();
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('updateError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleEntryFees = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const nextValue = entryFeePolicy.value.toLowerCase() === 'true' ? 'false' : 'true';
      await api.put<ApiResponse<SystemConfig>>(`/admin/configs/${entryFeePolicy.key}`, {
        value: nextValue,
        description: entryFeePolicy.description,
      });
      toast.success(
        nextValue === 'true'
          ? translate('entryFeesEnabled')
          : translate('entryFeesDisabled'),
      );
      await fetchConfigs();
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('entryFeesUpdateError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleSandbox = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const nextValue = sandboxConfig.value.toLowerCase() === 'true' ? 'false' : 'true';
      await api.put<ApiResponse<SystemConfig>>(`/admin/configs/${sandboxConfig.key}`, {
        value: nextValue,
        description: sandboxConfig.description,
      });
      toast.success(
        nextValue === 'true'
          ? translate('sandboxEnabledToast')
          : translate('sandboxDisabledToast'),
      );
      await fetchConfigs();
    } catch (error: unknown) {
      console.error(error);
      toast.error(translate('sandboxUpdateError'));
    } finally {
      setProcessing(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
                        {translate('title')}

          </h2>
          <p className="text-slate-500 text-sm">{translate('description')}</p>
        </div>
        <button
          onClick={fetchConfigs}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-2 rounded-lg transition-all"
        >
          <RefreshCw className="w-4 h-4" aria-label={translate('refresh')} />
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm">
                <BadgeDollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{translate('entryFeePolicyTitle')}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {translate('entryFeePolicyHeading')}
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {translate('entryFeePolicyDescription')}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={entryFeePolicy.value.toLowerCase() === 'true'}
              onClick={handleToggleEntryFees}
              disabled={processing}
              className={`flex min-w-40 items-center justify-between gap-4 rounded-full px-4 py-3 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                entryFeePolicy.value.toLowerCase() === 'true'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span>{entryFeePolicy.value.toLowerCase() === 'true' ? translate('enabled') : translate('disabled')}</span>
              <span
                className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  entryFeePolicy.value.toLowerCase() === 'true' ? 'translate-x-1' : '-translate-x-1'
                }`}
              />
            </button>
          </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-slate-800 p-3 text-white shadow-sm">
              <BadgeDollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{translate('platformFeeRuleTitle')}</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{translate('platformFeeRuleHeading')}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{translate('platformFeeRuleDescription')}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{translate('platformFeeThresholdLabel')}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatVndConfig(platformFeeThresholdConfig.value)} ₫</p>
            <p className="mt-1 text-xs text-slate-500">{translate('platformFeeThresholdHint')}</p>
            <button type="button" onClick={() => handleEdit(platformFeeThresholdConfig)} className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
              {translate('editRule')}
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{translate('platformFeeFixedAmountLabel')}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatVndConfig(platformFeeFixedAmountConfig.value)} ₫</p>
            <p className="mt-1 text-xs text-slate-500">{translate('platformFeeFixedAmountHint')}</p>
            <button type="button" onClick={() => handleEdit(platformFeeFixedAmountConfig)} className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
              {translate('editRule')}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 bg-amber-50/70 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-500 p-3 text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{translate('sandboxTitle')}</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{translate('sandboxHeading')}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-700">{translate('sandboxDescription')}</p>
              <p className="mt-2 text-xs font-semibold text-amber-800">{translate('sandboxWarning')}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sandboxConfig.value.toLowerCase() === 'true'}
            aria-label={translate('sandboxHeading')}
            onClick={handleToggleSandbox}
            disabled={processing}
            className={`flex min-w-40 items-center justify-between gap-4 rounded-full px-4 py-3 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${
              sandboxConfig.value.toLowerCase() === 'true'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            <span>{sandboxConfig.value.toLowerCase() === 'true' ? translate('enabled') : translate('disabled')}</span>
            <span className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${sandboxConfig.value.toLowerCase() === 'true' ? 'translate-x-1' : '-translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* Main configurations card */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : configs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500 shadow-sm">
          <p className="text-base font-medium text-slate-800">{translate('emptyTitle')}</p>
          <p className="text-xs text-slate-500 mt-1">{translate('emptyDescription')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 pl-6 w-1/4">{translate('tableKey')}</th>
                  <th className="p-4 w-1/4">{translate('tableValue')}</th>
                  <th className="p-4 w-1/6">{translate('tableScope')}</th>
                  <th className="p-4 w-1/3">{translate('tableDescription')}</th>
                  <th className="p-4 pr-6 text-right w-12">{translate('tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
                {configs.filter((config) => ![DEFAULT_ENTRY_FEE_POLICY_KEY, PAYMENT_SANDBOX_CONFIG_KEY, ...FEE_RULE_CONFIG_KEYS].includes(config.key)).map((config) => (
                  <tr key={config.key} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="p-4 pl-6 font-mono text-blue-600 font-semibold">{config.key}</td>
                    <td className="p-4 font-semibold text-slate-800">{config.value}</td>
                    <td className="p-4 text-xs font-semibold text-slate-600">{getConfigScope(config.key)}</td>
                    <td className="p-4 text-xs text-slate-500 leading-relaxed">{config.description || translate('noDescription')}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleEdit(config)}
                        className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-transparent p-1.5 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {showEditModal && selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{translate('modalTitle')}</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">{translate('modalKeyLabel')}</p>
                <p className="text-sm font-mono font-semibold text-blue-600">{selectedConfig.key}</p>
              </div>

              <div className="space-y-1.5">
                    <label className="text-xs text-slate-500">{translate('newValueLabel')}</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={translate('valuePlaceholder')}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                    <label className="text-xs text-slate-500">{translate('descriptionLabel')}</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={translate('descriptionPlaceholder')}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-colors resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                                {translate('cancel')}

              </button>
              <button
                onClick={handleUpdate}
                disabled={processing || !editValue.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                                {translate('save')}

              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

