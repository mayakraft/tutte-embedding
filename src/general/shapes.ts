import ear from "rabbit-ear";

export type Shape = {
	name: string;
	params: object;
};

export const shapeToElement = ({ name, params }: Shape) => {
	switch (name) {
		case "rect":
			return ear.svg.rect(params.x, params.y, params.width, params.height);
		case "line":
			return ear.svg.line(params.x1, params.y1, params.x2, params.y2);
		case "circle":
			return ear.svg.circle(params.cx, params.cy, params.r);
		case "path":
			return ear.svg.path(params.d);
	}
};
