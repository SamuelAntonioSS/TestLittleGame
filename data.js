// ── Pacientes ────────────────────────────────────────────────────────────────
const PATIENTS = [
  {
    name: "Deportista",
    avatar: "🏋️",
    goal: "Alto rendimiento físico",
    targets: { carbs: 40, protein: 40, fat: 20 },
    tolerance: 10
  },
  {
    name: "Paciente cardíaco",
    avatar: "❤️",
    goal: "Baja grasa, recuperación",
    targets: { carbs: 50, protein: 40, fat: 10 },
    tolerance: 10
  },
  {
    name: "Balance general",
    avatar: "⚖️",
    goal: "Dieta equilibrada",
    targets: { carbs: 50, protein: 30, fat: 20 },
    tolerance: 10
  }
];

// ── Accesos rápidos (datos por 100g hardcoded como fallback rápido) ───────────
const QUICK_FOODS = [
  { key: "arroz_blanco",    emoji: "🍚", label: "Arroz",    carbs: 28,  protein: 2.7, fat: 0.3, kcal: 130  },
  { key: "pechuga_pollo",   emoji: "🍗", label: "Pollo",    carbs: 0,   protein: 31,  fat: 3.6, kcal: 165  },
  { key: "aguacate",        emoji: "🥑", label: "Aguacate", carbs: 9,   protein: 2,   fat: 15,  kcal: 160  },
  { key: "pan_integral",    emoji: "🍞", label: "Pan",      carbs: 41,  protein: 8,   fat: 3.4, kcal: 247  },
  { key: "huevo",           emoji: "🥚", label: "Huevo",    carbs: 1.1, protein: 13,  fat: 11,  kcal: 155  },
  { key: "salmon",          emoji: "🐟", label: "Salmón",   carbs: 0,   protein: 25,  fat: 13,  kcal: 208  },
  { key: "brocoli",         emoji: "🥦", label: "Brócoli",  carbs: 7,   protein: 2.8, fat: 0.4, kcal: 34   },
  { key: "nueces",          emoji: "🥜", label: "Nueces",   carbs: 14,  protein: 15,  fat: 65,  kcal: 654  },
  { key: "pasta",           emoji: "🍝", label: "Pasta",    carbs: 71,  protein: 12,  fat: 1.5, kcal: 371  },
  { key: "tofu",            emoji: "⬜", label: "Tofu",     carbs: 1.9, protein: 17,  fat: 8.7, kcal: 144  },
  { key: "platano",         emoji: "🍌", label: "Plátano",  carbs: 23,  protein: 1.1, fat: 0.3, kcal: 89   },
  { key: "leche",           emoji: "🥛", label: "Leche",    carbs: 5,   protein: 3.4, fat: 3.7, kcal: 61   }
];