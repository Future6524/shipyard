/**
 * Product identity colors, drawn from the showreel palette: magenta, electric blue, amber.
 * Validated as a categorical set (all pairs) for color-vision deficiency; amber sits below
 * 3:1 on white, so charts always pair it with direct labels and a data table.
 * Products past the third fold into "Other".
 */
export const PRODUCT_COLORS = ["#e0157a", "#2a6be0", "#d98a00"];
export const OTHER_COLOR = "#8a8a8a";

export const productColor = (index: number) => PRODUCT_COLORS[index] ?? OTHER_COLOR;
