// Shared search and pagination behavior for People lists.
const PEOPLE_PAGE_SIZE = 8;

function peopleMatchesSearch(person, query) {
  const term = String(query || '').trim().toLocaleLowerCase();
  if (!term) return true;
  const haystack = [person.name, person.email, person.role, person.dept, peopleClientName(person.client), person.cc, WH_COUNTRIES[person.cc]?.[1]]
    .filter(Boolean).join(' ').toLocaleLowerCase();
  return haystack.includes(term);
}

function peoplePageSlice(rows, page) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PEOPLE_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const startIndex = (currentPage - 1) * PEOPLE_PAGE_SIZE;
  return { rows: rows.slice(startIndex, startIndex + PEOPLE_PAGE_SIZE), page: currentPage, pageCount, start: rows.length ? startIndex + 1 : 0, end: Math.min(startIndex + PEOPLE_PAGE_SIZE, rows.length), total: rows.length };
}

function renderPeoplePagination(container, pagination, onPageChange) {
  if (!container) return;
  const { page, pageCount, start, end, total } = pagination;
  const pageButtons = Array.from({ length: pageCount }, (_, index) => {
    const number = index + 1;
    return `<button type="button" class="pagination-button${number === page ? ' active' : ''}" data-page="${number}"${number === page ? ' aria-current="page"' : ''}>${number}</button>`;
  }).join('');
  container.innerHTML = `<span class="people-pagination-summary">Showing ${start}–${end} of ${total}</span><nav class="pagination" aria-label="People list pages">
    <button type="button" class="pagination-button" data-page="${page - 1}" aria-label="Previous page"${page <= 1 ? ' disabled' : ''}>‹</button>
    ${pageButtons}
    <button type="button" class="pagination-button" data-page="${page + 1}" aria-label="Next page"${page >= pageCount ? ' disabled' : ''}>›</button>
  </nav>`;
  container.onclick = event => {
    const button = event.target.closest('button[data-page]');
    if (button && !button.disabled) onPageChange(Number(button.dataset.page));
  };
}
