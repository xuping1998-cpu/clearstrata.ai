/**
 * Synthetic test identity definitions — builders only; no users created during harness implementation.
 */

export type TestIdentityKey =
  | 'authorizedCouncil'
  | 'authorizedAdmin'
  | 'authorizedPropertyAdmin'
  | 'ordinaryOwner'
  | 'unrelatedPropertyUser'
  | 'anon'
  | 'serviceRoleSetup';

export type SyntheticTestIdentity = {
  key: TestIdentityKey;
  email: string;
  role: string | null;
  propertyId: string | null;
  /** service_role is fixture setup only — never RLS PASS substitute */
  credentialClass: 'authenticated' | 'anon' | 'service_role';
};

export function buildTestIdentities(
  evidenceRunId: string,
  ownPropertyId: string,
  otherPropertyId: string,
): Record<TestIdentityKey, SyntheticTestIdentity> {
  const prefix = `e02-${evidenceRunId.slice(0, 8)}`;
  return {
    authorizedCouncil: {
      key: 'authorizedCouncil',
      email: `${prefix}-council@e02-synthetic.invalid`,
      role: 'council',
      propertyId: ownPropertyId,
      credentialClass: 'authenticated',
    },
    authorizedAdmin: {
      key: 'authorizedAdmin',
      email: `${prefix}-admin@e02-synthetic.invalid`,
      role: 'admin',
      propertyId: ownPropertyId,
      credentialClass: 'authenticated',
    },
    authorizedPropertyAdmin: {
      key: 'authorizedPropertyAdmin',
      email: `${prefix}-padmin@e02-synthetic.invalid`,
      role: 'property_admin',
      propertyId: ownPropertyId,
      credentialClass: 'authenticated',
    },
    ordinaryOwner: {
      key: 'ordinaryOwner',
      email: `${prefix}-owner@e02-synthetic.invalid`,
      role: 'owner',
      propertyId: ownPropertyId,
      credentialClass: 'authenticated',
    },
    unrelatedPropertyUser: {
      key: 'unrelatedPropertyUser',
      email: `${prefix}-other@e02-synthetic.invalid`,
      role: 'owner',
      propertyId: otherPropertyId,
      credentialClass: 'authenticated',
    },
    anon: {
      key: 'anon',
      email: `${prefix}-anon@e02-synthetic.invalid`,
      role: null,
      propertyId: null,
      credentialClass: 'anon',
    },
    serviceRoleSetup: {
      key: 'serviceRoleSetup',
      email: `${prefix}-setup@e02-synthetic.invalid`,
      role: null,
      propertyId: null,
      credentialClass: 'service_role',
    },
  };
}
