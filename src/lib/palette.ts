/**
 * Product identity colors: categorical slots 1–3 of the validated data-viz palette
 * (blue, orange, aqua). These three clear the all-pairs color-vision checks, so they
 * stay distinguishable in every chart. Products past the third fold into "Other".
 */
export const PRODUCT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];
export const OTHER_COLOR = "#8a8f9c";

export const productColor = (index: number) => PRODUCT_COLORS[index] ?? OTHER_COLOR;
