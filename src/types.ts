export type ScaledMouseEvent = MouseEvent & {
	point: [number, number];
	id?: string;
};

export type ScaledWheelEvent = WheelEvent & {
	// wheelDelta: number,
	point: [number, number];
	id?: string;
};
