// ── Open Food Facts API ──────────────────────────────────────────────────────
// Docs: https://wiki.openfoodfacts.org/API
// CORS abierto, sin API key, gratis

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';

/**
 * Busca alimentos en Open Food Facts.
 * Retorna un array de objetos { name, carbs, protein, fat, kcal } por 100g.
 */
async function searchFoods(query) {
  const params = new URLSearchParams({
    search_terms:  query,
    search_simple: 1,
    action:        'process',
    json:          1,
    page_size:     10,
    fields:        'product_name,nutriments,image_small_url'
  });

  const url = `${OFF_SEARCH}?${params.toString()}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (!data.products || data.products.length === 0) return [];

  return data.products
    .filter(p => p.product_name && p.nutriments)
    .map(p => {
      const n = p.nutriments;
      return {
        name:    p.product_name,
        carbs:   parseFloat((n['carbohydrates_100g'] ?? 0).toFixed(1)),
        protein: parseFloat((n['proteins_100g']      ?? 0).toFixed(1)),
        fat:     parseFloat((n['fat_100g']           ?? 0).toFixed(1)),
        kcal:    parseFloat((n['energy-kcal_100g']   ?? calcKcal(
                               n['carbohydrates_100g'] ?? 0,
                               n['proteins_100g']      ?? 0,
                               n['fat_100g']           ?? 0
                             )).toFixed(0)),
        fiber:   parseFloat((n['fiber_100g']         ?? 0).toFixed(1)),
        sugar:   parseFloat((n['sugars_100g']        ?? 0).toFixed(1)),
        sodium:  parseFloat((n['sodium_100g']        ?? 0).toFixed(2))
      };
    })
    .filter(p => p.carbs > 0 || p.protein > 0 || p.fat > 0);
}

/**
 * Si la API no devuelve kcal, los calculamos:
 * carbos × 4 + proteína × 4 + grasa × 9
 */
function calcKcal(carbs, protein, fat) {
  return (carbs * 4) + (protein * 4) + (fat * 9);
}