const OWNER_TEAM = ['Qonit', 'Marcus', 'Jia Ling', 'Aisha', 'Ben', 'Natasa', 'Yosefin'];

function ownerPrimary(record) {
  return record.primaryOwner || (Array.isArray(record.owner) ? record.owner[1] : record.owner) || '';
}

function ownerSecondary(record) {
  return record.secondaryOwner || '';
}

function ownerReady(record) {
  const primary = ownerPrimary(record);
  const secondary = ownerSecondary(record);
  return !!primary && !!secondary && primary !== secondary;
}

function ownerInitials(name) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function ownerAssignmentFieldsHtml(record, type, id) {
  const primary = ownerPrimary(record);
  const secondary = ownerSecondary(record);
  const names = [...new Set([primary, secondary, ...OWNER_TEAM].filter(Boolean))];
  const options = selected => `<option value="">Choose a team member…</option>${names.map(name => `<option value="${escapeHtml(name)}"${name === selected ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}`;
  return `<div class="owner-assignment-fields" data-owner-assignment="${escapeHtml(type)}:${escapeHtml(id)}">
    <label class="form-group"><span class="form-label">Primary owner <span class="req">*</span></span><select class="form-select form-select-sm" data-owner-role="primary" aria-label="Primary owner">${options(primary)}</select></label>
    <label class="form-group"><span class="form-label">Secondary owner (backup) <span class="req">*</span></span><select class="form-select form-select-sm" data-owner-role="secondary" aria-label="Secondary owner">${options(secondary)}</select></label>
    <div class="owner-assignment-actions">${ownerReady(record) ? `<span class="owner-assignment-status">✓ Primary and backup assigned</span><button type="button" class="btn btn-secondary btn-sm" data-owner-takeover>Make backup primary</button>` : '<span class="owner-assignment-status owner-assignment-missing">Backup needed before work can progress</span>'}</div>
  </div>`;
}

function ownerSet(record, primary, secondary) {
  if (primary && primary === secondary) throw new Error('Primary and secondary owners must be different people.');
  record.primaryOwner = primary || '';
  record.secondaryOwner = secondary || '';
  if (Array.isArray(record.owner)) record.owner = [ownerInitials(record.primaryOwner || '?'), record.primaryOwner];
  else record.owner = record.primaryOwner;
}

function ownerTakeover(record) {
  if (!ownerReady(record)) throw new Error('Assign different primary and secondary owners before takeover.');
  ownerSet(record, ownerSecondary(record), ownerPrimary(record));
}

function ownerAssignmentSummary(record) {
  const primary = ownerPrimary(record) || 'Unassigned';
  const secondary = ownerSecondary(record) || 'Backup needed';
  return `<span class="owner-assignment-summary"><span><strong>Primary</strong> ${escapeHtml(primary)}</span><span><strong>Backup</strong> ${escapeHtml(secondary)}</span></span>`;
}

function ownerProgressBlock(record) {
  return ownerReady(record) ? '' : 'Assign different primary and secondary owners before this record can move out of intake or progress to its next stage.';
}
