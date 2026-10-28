// Device management (MDM) data: per-client platform and per-device enrolment records.
// Mixed fleet: JumpCloud is the default; some clients run Intune or Jamf. Device management is part of the
// Secure and Complete plans, so Support/Free clients have no platform (CLIENT_MDM null).
// Enrolment pipeline follows the help-center flow: Invited → Agent installed → Enrolled → Verified.
// method: how the device enrols — abm (Apple Business Manager), autopilot (Windows), manual (Esevel installs on
// the employee's behalf), self (employee follows the guide). Needs hub-data.js. Actions persist in localStorage.

const MDM_PLATFORMS = {
  jumpcloud: { name: 'JumpCloud', agent: 'JumpCloud Agent', tag: 'mdm-jumpcloud' },
  intune: { name: 'Microsoft Intune', agent: 'Intune enrolment', tag: 'mdm-intune' },
  jamf: { name: 'Jamf Pro', agent: 'Jamf binary', tag: 'mdm-jamf' }
};

// Secure/Complete clients get a platform; Support (digital, finance) and Free (brightpath) get none
const CLIENT_MDM = {
  acme: 'jumpcloud', techglobal: 'intune', mediaworks: 'jumpcloud',
  northwind: 'jumpcloud', cloud: 'intune', digital: null, finance: null, brightpath: null
};

// invited / agent-installed / enrolled are telemetry synced from the MDM (the platform never edits them);
// verified is the one human step — an admin attests that onboarding completed (help center: "verify onboarding completion").
const MDM_STATES = {
  invited: ['Invited', 'badge-info'],
  'agent-installed': ['Agent installed', 'badge-warning'],
  enrolled: ['Enrolled', 'badge-warning'],
  verified: ['Verified', 'badge-success'],
  'not-enrolled': ['Not enrolled', 'badge-neutral']
};
const MDM_STATE_ORDER = ['not-enrolled', 'invited', 'agent-installed', 'enrolled', 'verified'];
const MDM_METHODS = {
  abm: 'ABM (zero-touch)', autopilot: 'Windows Autopilot', manual: 'Installed by Esevel', self: 'Employee self-install'
};
// Last directory/MDM sync per platform (matches the Integrations rows)
const MDM_LAST_SYNC = { jumpcloud: '22m ago', intune: '6h ago', jamf: '1h ago' };

// Seed fleet: deployed laptops across managed clients. lastCheckin null until the agent reports in.
const MDM_DEVICES = [
  { serial: 'C02XK3988A', model: 'MacBook Pro 14" M3', os: 'macOS', osVersion: '15.1', client: 'acme', cc: 'SG', user: 'Ravi Shah', method: 'abm', state: 'verified', lastCheckin: '2026-10-28T08:10', byod: false },
  { serial: 'C02XK4M9MD6T', model: 'MacBook Pro 14" M3', os: 'macOS', osVersion: '15.0', client: 'acme', cc: 'SG', user: 'Priya Raman', method: 'abm', state: 'verified', lastCheckin: '2026-10-27T18:44', byod: false },
  { serial: 'C02XK5522F', model: 'MacBook Pro 14" M3', os: 'macOS', osVersion: '14.7', client: 'acme', cc: 'SG', user: 'Sophie Tan', method: 'manual', state: 'enrolled', lastCheckin: '2026-10-28T07:02', byod: false, onb: 'ONB-1186' },
  { serial: 'C02XK6710G', model: 'MacBook Air 13" M2', os: 'macOS', osVersion: '15.1', client: 'acme', cc: 'MY', user: 'Wei Jie Lim', method: 'self', state: 'agent-installed', lastCheckin: '2026-10-26T12:30', byod: false },
  { serial: 'ACME-BYOD-01', model: 'MacBook Air 13" M2', os: 'macOS', osVersion: '14.6', client: 'acme', cc: 'SG', user: 'Mei Hua Ong', method: 'self', state: 'invited', lastCheckin: null, byod: true },
  { serial: '8HJ23011C', model: 'Dell XPS 15', os: 'Windows', osVersion: '11 Pro 24H2', client: 'techglobal', cc: 'US', user: 'Sarah Kim', method: 'autopilot', state: 'verified', lastCheckin: '2026-10-28T01:15', byod: false },
  { serial: '8HJ2KL3', model: 'Dell XPS 15', os: 'Windows', osVersion: '11 Pro 23H2', client: 'techglobal', cc: 'US', user: 'Daniel Ortiz', method: 'autopilot', state: 'verified', lastCheckin: '2026-10-27T22:51', byod: false },
  { serial: '8HJ26620K', model: 'Dell XPS 15', os: 'Windows', osVersion: '11 Pro 24H2', client: 'techglobal', cc: 'US', user: 'Ethan Walker', method: 'autopilot', state: 'invited', lastCheckin: null, byod: false, onb: 'ONB-1194' },
  { serial: 'TG-BYOD-WIN4', model: 'Lenovo Yoga 7i', os: 'Windows', osVersion: '11 Home', client: 'techglobal', cc: 'US', user: 'Grace Field', method: 'self', state: 'not-enrolled', lastCheckin: null, byod: true, blocker: 'Windows Home is not supported for MDM enrolment' },
  { serial: 'X1C-77821M', model: 'Lenovo ThinkPad X1 Carbon', os: 'Windows', osVersion: '11 Pro 24H2', client: 'techglobal', cc: 'SG', user: 'Hannah Lee', method: 'manual', state: 'enrolled', lastCheckin: '2026-10-28T03:40', byod: false, onb: 'ONB-1190' },
  { serial: 'C02XK4W5MD6T', model: 'MacBook Pro 14" M3', os: 'macOS', osVersion: '15.1', client: 'mediaworks', cc: 'SG', user: 'Mei Lin Tan', method: 'abm', state: 'enrolled', lastCheckin: '2026-10-28T06:20', byod: false, onb: 'ONB-1179' },
  { serial: 'C02XK8103H', model: 'MacBook Pro 16" M3 Max', os: 'macOS', osVersion: '15.1', client: 'mediaworks', cc: 'SG', user: 'Arjun Mehta', method: 'abm', state: 'invited', lastCheckin: null, byod: false, onb: 'ONB-1182' },
  { serial: 'C02YH7N2MD6T', model: 'MacBook Pro 14" M3', os: 'macOS', osVersion: '15.0', client: 'northwind', cc: 'US', user: 'Grace Lim', method: 'manual', state: 'verified', lastCheckin: '2026-10-27T15:05', byod: false },
  { serial: 'AIR-99031Q', model: 'MacBook Air 13" M2', os: 'macOS', osVersion: '14.7', client: 'northwind', cc: 'US', user: 'James Whitfield', method: 'self', state: 'agent-installed', lastCheckin: '2026-10-25T09:12', byod: false, onb: 'ONB-1184' },
  { serial: '8HJ29118S', model: 'Dell XPS 15', os: 'Windows', osVersion: '11 Pro 24H2', client: 'cloud', cc: 'US', user: 'Ryan Cooper', method: 'autopilot', state: 'agent-installed', lastCheckin: '2026-10-27T20:08', byod: false, onb: 'ONB-1185' },
  { serial: '8HJ29544T', model: 'Dell XPS 15', os: 'Windows', osVersion: '11 Pro 23H2', client: 'cloud', cc: 'US', user: 'Grace Liu', method: 'self', state: 'invited', lastCheckin: null, byod: false }
];

// Prototype: synced state only lasts for the current page view; a refresh resets to the seeds above.

// Why a device has no enrolment record. Only computers enrol (the agent runs on macOS/Windows/Linux);
// stored devices get the agent at provisioning; a deployed computer at an MDM client is an actionable gap.
function mdmGapReason(clientId, category, status) {
  if (!CLIENT_MDM[clientId]) return 'no-plan';
  if (category && !/laptop|computer/i.test(category)) return 'not-applicable';
  if (status && /storage|transit/i.test(status)) return 'pre-deployment';
  return 'gap';
}

/* ---------- Identity services (MFA, SSO applications, password manager) ---------- */

// Whether the client has bought MFA: Complete includes it, Secure needs the add-on (billing-data.js PLAN_ADDONS)
const CLIENT_IDENTITY = {
  acme: { plan: 'Secure', mfaPurchased: true, pmUsers: 96, pmEnrolled: 71 },
  techglobal: { plan: 'Complete', mfaPurchased: true, pmUsers: null, pmEnrolled: null }, // Intune: no JumpCloud PM
  mediaworks: { plan: 'Secure', mfaPurchased: false, pmUsers: 55, pmEnrolled: 12 },
  northwind: { plan: 'Complete', mfaPurchased: true, pmUsers: 82, pmEnrolled: 60 },
  cloud: { plan: 'Secure', mfaPurchased: true, pmUsers: null, pmEnrolled: null }
};

// MFA enrolment per managed user (sample roster per client; totals align with billable-user scale)
const MFA_ROSTERS = {
  acme: { enrolled: 118, total: 144, methods: { protect: 92, totp: 26 } },
  techglobal: { enrolled: 371, total: 397, methods: { authenticator: 371 } },
  mediaworks: null, // not purchased
  northwind: { enrolled: 61, total: 90, methods: { protect: 48, totp: 13 } },
  cloud: { enrolled: 70, total: 73, methods: { authenticator: 70 } }
};

// SSO application catalog per client. flow: idp (IdP-initiated) or sp (SP-initiated).
const SSO_APPS = {
  acme: [
    { app: 'Google Workspace', flow: 'sp', status: 'Active', users: 144 },
    { app: 'Slack', flow: 'idp', status: 'Active', users: 139 },
    { app: 'GitHub', flow: 'sp', status: 'Active', users: 58 },
    { app: 'Notion', flow: 'idp', status: 'Pending', users: 0 }
  ],
  techglobal: [
    { app: 'Microsoft 365', flow: 'sp', status: 'Active', users: 397 },
    { app: 'Salesforce', flow: 'sp', status: 'Active', users: 120 },
    { app: 'Zoom', flow: 'idp', status: 'Active', users: 380 }
  ],
  mediaworks: [
    { app: 'Google Workspace', flow: 'sp', status: 'Active', users: 63 },
    { app: 'Adobe Creative Cloud', flow: 'idp', status: 'Active', users: 41 }
  ],
  northwind: [
    { app: 'Google Workspace', flow: 'sp', status: 'Active', users: 90 },
    { app: 'Epic (healthcare)', flow: 'sp', status: 'Pending', users: 0 }
  ],
  cloud: [
    { app: 'Microsoft 365', flow: 'sp', status: 'Active', users: 73 },
    { app: 'Datadog', flow: 'idp', status: 'Active', users: 31 }
  ]
};

// Staff-added/removed SSO apps persist for the browser session
const SSO_STORAGE = 'sap-sso-apps-v1';
(function applySsoState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SSO_STORAGE) || 'null');
    if (saved) Object.keys(saved).forEach(c => { SSO_APPS[c] = saved[c]; });
  } catch { /* malformed prototype data is ignored */ }
})();
function ssoSave() {
  try { localStorage.setItem(SSO_STORAGE, JSON.stringify(SSO_APPS)); }
  catch { /* storage full or blocked: state stays for this page only */ }
}

const mdmPlatform = clientId => MDM_PLATFORMS[CLIENT_MDM[clientId]] || null;
const mdmClientDevices = clientId => MDM_DEVICES.filter(d => d.client === clientId);
// Telemetry states a sync can move a device through (verification stays human)
function mdmNextTelemetryStep(d) {
  if (d.blocker) return null;
  const i = MDM_STATE_ORDER.indexOf(d.state);
  return i >= 0 && MDM_STATE_ORDER[i + 1] && MDM_STATE_ORDER[i + 1] !== 'verified' ? MDM_STATE_ORDER[i + 1] : null;
}
