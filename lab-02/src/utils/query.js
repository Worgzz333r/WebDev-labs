// Пагінація: page >= 1, limit у межах 1..maxLimit
export function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1),
    maxLimit,
  );
  return { page, limit, skip: (page - 1) * limit };
}

// Сортування: поле лише з білого списку, напрямок лише asc/desc
export function parseSort(query, allowedFields, defaultField = 'id', defaultOrder = 'desc') {
  const field = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
  const direction = ['asc', 'desc'].includes(query.order) ? query.order : defaultOrder;
  return { [field]: direction };
}

export function buildPagination({ page, limit, skip }, total, itemsCount) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + itemsCount < total,
  };
}

// Додатне ціле з query-рядка або null, якщо значення некоректне
export function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}