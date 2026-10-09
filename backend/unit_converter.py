"""
FoodShield — DemandSense Unit Conversion Engine
Robust dimensional analysis and unit conversions between mass, volume, and discrete counts.
Supports cross-dimensional conversion (mass <-> volume) via ingredient density.
"""

from typing import Optional, Dict

# Known standard culinary densities in g/ml
DEFAULT_INGREDIENT_DENSITIES: Dict[str, float] = {
    "milk": 1.03,
    "full cream milk": 1.03,
    "toned milk": 1.03,
    "cream": 1.01,
    "heavy cream": 1.01,
    "oil": 0.92,
    "refined oil": 0.92,
    "sunflower oil": 0.92,
    "mustard oil": 0.92,
    "olive oil": 0.92,
    "water": 1.00,
    "honey": 1.42,
    "yogurt": 1.06,
    "curd": 1.06,
    "tomato puree": 1.05,
    "tomato gravy": 1.05,
    "clarified butter": 0.91,
    "ghee": 0.91,
}

# Conversion multipliers to base unit: grams (g)
MASS_TO_GRAMS: Dict[str, float] = {
    "g": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "gm": 1.0,
    "kg": 1000.0,
    "kilogram": 1000.0,
    "kilograms": 1000.0,
    "mg": 0.001,
    "milligram": 0.001,
    "milligrams": 0.001,
    "oz": 28.3495,
    "ounce": 28.3495,
    "ounces": 28.3495,
    "lb": 453.592,
    "lbs": 453.592,
    "pound": 453.592,
    "pounds": 453.592,
}

# Conversion multipliers to base unit: milliliters (ml)
VOLUME_TO_ML: Dict[str, float] = {
    "ml": 1.0,
    "milliliter": 1.0,
    "milliliters": 1.0,
    "millilitre": 1.0,
    "millilitres": 1.0,
    "l": 1000.0,
    "liter": 1000.0,
    "liters": 1000.0,
    "litre": 1000.0,
    "litres": 1000.0,
    "cup": 240.0,
    "cups": 240.0,
    "tbsp": 15.0,
    "tablespoon": 15.0,
    "tablespoons": 15.0,
    "tsp": 5.0,
    "teaspoon": 5.0,
    "teaspoons": 5.0,
}

# Discrete count units
COUNT_UNITS = {
    "pcs", "piece", "pieces", "unit", "units", "item", "items", "nos", "pack", "packs"
}


def normalize_unit(unit_str: str) -> str:
    """Normalize unit string to lowercase without surrounding whitespace."""
    if not unit_str:
        return ""
    clean = unit_str.strip().lower()
    return clean


def get_unit_dimension(unit_str: str) -> str:
    """
    Returns the physical dimension for the unit:
    'mass', 'volume', 'count', or 'unknown'.
    """
    u = normalize_unit(unit_str)
    if u in MASS_TO_GRAMS:
        return "mass"
    if u in VOLUME_TO_ML:
        return "volume"
    if u in COUNT_UNITS:
        return "count"
    return "unknown"


def resolve_density(
    density_g_per_ml: Optional[float] = None,
    ingredient_name: Optional[str] = None
) -> Optional[float]:
    """
    Resolves density from explicit argument or standard culinary fallback dictionary.
    """
    if density_g_per_ml is not None and density_g_per_ml > 0:
        return float(density_g_per_ml)
    
    if ingredient_name:
        ing_clean = ingredient_name.strip().lower()
        for key, val in DEFAULT_INGREDIENT_DENSITIES.items():
            if key in ing_clean:
                return val
    
    return None


def convert_quantity(
    quantity: float,
    from_unit: str,
    to_unit: str,
    density_g_per_ml: Optional[float] = None,
    ingredient_name: Optional[str] = None
) -> float:
    """
    Converts a numerical quantity from one unit to another.
    Handles intra-dimensional (e.g. grams <-> kg) and cross-dimensional (mass <-> volume)
    conversions using ingredient density.
    
    Raises ValueError for incompatible dimensions or missing density.
    """
    u_from = normalize_unit(from_unit)
    u_to = normalize_unit(to_unit)
    
    if u_from == u_to:
        return float(quantity)
    
    dim_from = get_unit_dimension(u_from)
    dim_to = get_unit_dimension(u_to)
    
    if dim_from == "unknown" or dim_to == "unknown":
        raise ValueError(f"Unrecognized unit dimension: '{from_unit}' or '{to_unit}'")
    
    # 1. Mass to Mass
    if dim_from == "mass" and dim_to == "mass":
        grams = quantity * MASS_TO_GRAMS[u_from]
        return grams / MASS_TO_GRAMS[u_to]
    
    # 2. Volume to Volume
    if dim_from == "volume" and dim_to == "volume":
        ml = quantity * VOLUME_TO_ML[u_from]
        return ml / VOLUME_TO_ML[u_to]
    
    # 3. Discrete Count to Discrete Count
    if dim_from == "count" and dim_to == "count":
        return float(quantity)
    
    # 4. Incompatible Count conversions
    if dim_from == "count" or dim_to == "count":
        raise ValueError(
            f"Cannot convert discrete count unit '{from_unit}' to continuous unit '{to_unit}' "
            f"without an explicit item piece-weight factor."
        )
    
    # 5. Cross-Dimensional (Mass <-> Volume)
    effective_density = resolve_density(density_g_per_ml, ingredient_name)
    if not effective_density or effective_density <= 0:
        raise ValueError(
            f"Cross-dimension conversion between '{from_unit}' ({dim_from}) and '{to_unit}' ({dim_to}) "
            f"requires ingredient density (g/ml). Please specify density_g_per_ml for '{ingredient_name or 'ingredient'}'."
        )
    
    if dim_from == "mass" and dim_to == "volume":
        # grams = quantity * MASS_TO_GRAMS[u_from]
        # ml = grams / density
        grams = quantity * MASS_TO_GRAMS[u_from]
        ml = grams / effective_density
        return ml / VOLUME_TO_ML[u_to]
    
    if dim_from == "volume" and dim_to == "mass":
        # ml = quantity * VOLUME_TO_ML[u_from]
        # grams = ml * density
        ml = quantity * VOLUME_TO_ML[u_from]
        grams = ml * effective_density
        return grams / MASS_TO_GRAMS[u_to]

    raise ValueError(f"Unsupported conversion from '{from_unit}' to '{to_unit}'")


def are_units_compatible(
    from_unit: str,
    to_unit: str,
    density_g_per_ml: Optional[float] = None,
    ingredient_name: Optional[str] = None
) -> bool:
    """Checks whether two units can be converted."""
    try:
        convert_quantity(
            1.0,
            from_unit,
            to_unit,
            density_g_per_ml=density_g_per_ml,
            ingredient_name=ingredient_name
        )
        return True
    except ValueError:
        return False
