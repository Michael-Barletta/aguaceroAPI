/**
 * A utility module for converting between different physical units.
 * Contains a comprehensive object of conversion functions and a helper
 * to retrieve the correct function based on unit names.
 */

// The main object containing all the raw conversion functions.
export const unitConversions = {
    kelvin_to_celsius: (data) => data - 273.15,
    kelvin_to_fahrenheit: (data) => (data - 273.15) * 9/5 + 32,
    kelvin_to_c: (data) => data - 273.15,
    kelvin_to_f: (data) => (data - 273.15) * 9/5 + 32,
    k_to_celsius: (data) => data - 273.15,
    k_to_fahrenheit: (data) => (data - 273.15) * 9/5 + 32,
    k_to_c: (data) => data - 273.15,
    k_to_f: (data) => (data - 273.15) * 9/5 + 32,
    celsius_to_fahrenheit: (data) => (data * 9/5) + 32,
    celsius_to_f: (data) => (data * 9/5) + 32,
    c_to_fahrenheit: (data) => (data * 9/5) + 32,
    c_to_f: (data) => (data * 9/5) + 32,
    fahrenheit_to_celsius: (data) => (data - 32) * 5/9,
    fahrenheit_to_c: (data) => (data - 32) * 5/9,
    f_to_celsius: (data) => (data - 32) * 5/9,
    f_to_c: (data) => (data - 32) * 5/9,
    meters_to_feet: (data) => data * 3.28084,
    meters_to_km: (data) => data / 1000,
    m_to_feet: (data) => data * 3.28084,
    m_to_ft: (data) => data * 3.28084,
    m_to_km: (data) => data / 1000,
    kts_to_mph: (data) => data * 1.15078,
    mph_to_kts: (data) => data / 1.15078,
    kts_to_ms: (data) => data / 1.94384449,
    mph_to_ms: (data) => data / 2.23693629,
    ms_to_mph: (data) => data * 2.23694,
    ms_to_kts: (data) => data * 1.94384,
    kts_to_kmh: (data) => data * 1.852,
    mph_to_kmh: (data) => data * 1.60934,
    ms_to_kmh: (data) => data * 3.6,
    kmh_to_kts: (data) => data / 1.852,
    kmh_to_mph: (data) => data / 1.60934,
    kmh_to_ms: (data) => data / 3.6,
    inches_to_mm: (data) => data * 25.4,
    inches_to_cm: (data) => data * 2.54,
    in_to_mm: (data) => data * 25.4,
    in_to_cm: (data) => data * 2.54,
    mm_to_in: (data) => data / 25.4,
    mm_to_inches: (data) => data / 25.4,
    cm_to_in: (data) => data / 2.54,
    cm_to_inches: (data) => data / 2.54,
    inhr_to_mmhr: (data) => data * 25.4,
    inhr_to_cmhr: (data) => data * 2.54,
    in_hr_to_mm_hr: (data) => data * 25.4,
    in_hr_to_cm_hr: (data) => data * 2.54,
    mmhr_to_inhr: (data) => data / 25.4,
    cmhr_to_inhr: (data) => data / 2.54,
    mm_hr_to_in_hr: (data) => data / 25.4,
    cm_hr_to_in_hr: (data) => data / 2.54,
    mmhr_to_cmhr: (data) => data / 10,
    cmhr_to_mmhr: (data) => data * 10,
    mm_hr_to_cm_hr: (data) => data / 10,
    cm_hr_to_mm_hr: (data) => data * 10
};

/**
 * Finds and returns the correct conversion function based on "from" and "to" unit strings.
 * It normalizes common unit abbreviations to a consistent key.
 * @param {string} fromUnit - The starting unit (e.g., 'kelvin', '°C', 'kts').
 * @param {string} toUnit - The target unit (e.g., 'fahrenheit', '°F', 'mph').
 * @returns {function(number): number | null} The conversion function, or null if not found.
 */
export function getUnitConversionFunction(fromUnit, toUnit) {
    // A map to standardize various unit string formats to a single key format.
    const unitMap = {
        '°c': 'c', '°f': 'f', '°k': 'k',
        'celsius': 'c', 'fahrenheit': 'f', 'kelvin': 'k',
        'c': 'c', 'f': 'f', 'k': 'k', '°F': 'f', '°C': 'c',
        'kts': 'kts', 'm/s': 'ms', 'mph': 'mph', 'km/h': 'kmh',
        'knots': 'kts',
        'ft': 'ft', 'feet': 'ft',
        'km': 'km',
        'mm': 'mm',
        'cm': 'cm',
        'm': 'm', 'meters': 'm',
        'in/hr': 'inhr', 'mm/hr': 'mmhr', 'cm/hr': 'cmhr',
        'in': 'in', 'inches': 'in'
    };
    
    // Cleans and standardizes the input unit string.
    const normalizeUnit = (unit) => {
        if (!unit) return '';
        const lowerUnit = unit.toLowerCase().trim();
        return unitMap[lowerUnit] || lowerUnit;
    };
    
    const fromNormalized = normalizeUnit(fromUnit);
    const toNormalized = normalizeUnit(toUnit);
    
    // Constructs the key to look up in the `unitConversions` object (e.g., 'k_to_f').
    const conversionKey = `${fromNormalized}_to_${toNormalized}`;
    
    // Return the function if it exists, otherwise return null.
    return unitConversions[conversionKey] || null;
}