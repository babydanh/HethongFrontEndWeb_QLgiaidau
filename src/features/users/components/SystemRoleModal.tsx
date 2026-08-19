'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { usersApi, type SystemRole } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';

export interface AdminUserItem {
  id: string;
  email: string;
  roles?: SystemRole[];
  profile?: { fullName?: string };
}

interface RoleOption {
  value: SystemRole;
  label: string;
  description: string;
  sensitive?: boolean;
}

export const SYSTEM_ROLE_OPTIONS: readonly RoleOption[] = [
  { value: 'PLAYER', label: 'Player', description: 'Base role for every account.' },
  { value: 'REFEREE', label: 'Referee', description: 'System-level referee operations.' },
  { value: 'ORGANIZER', label: 'Organizer', description: 'Eligible to create tournaments outside clubs.' },
  { value: 'MODERATOR', label: 'Moderator', description: 'Handle reports and moderation.', sensitive: true },
  { value: 'ADMIN', label: 'Administrator', description: 'Full platform administration access.', sensitive: true },
];

export const roleLabel = (role: SystemRole): string =>
  SYSTEM_ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;

const roleSchema = z.object({
  roles: z.array(z.enum(['PLAYER', 'REFEREE', 'ORGANIZER', 'MODERATOR', 'ADMIN'])),
  acknowledgeSensitive: z.boolean(),
});

type RoleForm = z.infer<typeof roleSchema>;

interface SystemRoleModalProps {
  user: AdminUserItem;
  onClose: () => void;
  onSaved: (roles: SystemRole[]) => void;
}

const normalizedRoles = (roles?: SystemRole[]): SystemRole[] =>
  Array.from(new Set<SystemRole>(['PLAYER', ...(roles ?? [])]));

const sameRoles = (left: SystemRole[], right: SystemRole[]): boolean =>
  [...left].sort().join('|') === [...right].sort().join('|');

export function SystemRoleModal({ user, onClose, onSaved }: SystemRoleModalProps) {
  const translate = useTranslations('AdminModeration');
  const currentRoles = normalizedRoles(user.roles);
  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { roles: currentRoles, acknowledgeSensitive: false },
  });
  const selectedRoles = normalizedRoles(useWatch({ control: form.control, name: 'roles' }));
  const hasChanges = !sameRoles(selectedRoles, currentRoles);
  const touchesSensitiveRole = (['ADMIN', 'MODERATOR'] as const).some(
    (role) => selectedRoles.includes(role) !== currentRoles.includes(role),
  );

  const submit = form.handleSubmit(async (values) => {
    const nextRoles = normalizedRoles(values.roles);
    if (sameRoles(nextRoles, currentRoles)) {
      onClose();
      return;
    }
    if (touchesSensitiveRole && !values.acknowledgeSensitive) {
      form.setError('acknowledgeSensitive', {
        message: translate('sensitiveRoleError'),
      });
      return;
    }

    try {
      const result = await usersApi.updateSystemRoles(user.id, nextRoles);
      onSaved(result.roles ?? nextRoles);
      toast.success(translate('roleUpdated'));
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('roleUpdateFailed')));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-role-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <h3 id="system-role-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <KeyRound className="h-5 w-5 text-blue-600" />
              {translate('roleModalTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {translate('roleModalDescription')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={translate('close')} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{user.profile?.fullName || translate('defaultUser')}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{translate('rolesApplied')}</legend>
            <div className="space-y-2">
              {SYSTEM_ROLE_OPTIONS.map((option) => {
                const selected = selectedRoles.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    } ${option.value === 'PLAYER' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={option.value === 'PLAYER'}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? normalizedRoles([...selectedRoles, option.value])
                          : selectedRoles.filter((role) => role !== option.value);
                        form.setValue('roles', next, { shouldDirty: true, shouldValidate: true });
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        {translate(
                          option.value === 'PLAYER'
                            ? 'rolePlayer'
                            : option.value === 'REFEREE'
                              ? 'roleReferee'
                              : option.value === 'ORGANIZER'
                                ? 'roleOrganizer'
                                : option.value === 'MODERATOR'
                                  ? 'roleModerator'
                                  : 'roleAdmin',
                        )}
                        {option.sensitive && <span className="text-[10px] font-bold uppercase text-amber-700">{translate('sensitive')}</span>}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {translate(
                          option.value === 'PLAYER'
                            ? 'rolePlayerDescription'
                            : option.value === 'REFEREE'
                              ? 'roleRefereeDescription'
                              : option.value === 'ORGANIZER'
                                ? 'roleOrganizerDescription'
                                : option.value === 'MODERATOR'
                                  ? 'roleModeratorDescription'
                                  : 'roleAdminDescription',
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {touchesSensitiveRole && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <input
                type="checkbox"
                {...form.register('acknowledgeSensitive')}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600"
              />
              {translate('acknowledgeSensitive')}
            </label>
          )}
          {form.formState.errors.acknowledgeSensitive?.message && (
            <p className="text-xs font-semibold text-rose-600">{form.formState.errors.acknowledgeSensitive.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
          <Button type="button" variant="outline" onClick={onClose}>{translate('cancel')}</Button>
          <Button type="submit" disabled={form.formState.isSubmitting || !hasChanges}>
            {form.formState.isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {translate('saveRoles')}
          </Button>
        </div>
      </form>
    </div>
  );
}
