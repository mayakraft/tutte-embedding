import type { FOLD } from "rabbit-ear/types.js";
import { boundaries as Boundaries } from "rabbit-ear/graph/boundary.js";
import { connectedComponentsPairs } from "rabbit-ear/graph/connectedComponents.js";
import { makeEdgesFaces } from "rabbit-ear/graph/make/edgesFaces.js";
import { makeFacesFaces } from "rabbit-ear/graph/make/facesFaces.js";
import { add2, normalize2 } from "rabbit-ear/math/vector.js";
import { fold } from "./file.svelte.ts";
import type { Shape } from "../general/shapes.ts";

const averageAngles = (angles: number[]) => {
	const vectorSum = angles
		.map((a) => [Math.cos(a), Math.sin(a)] as [number, number])
		.reduce((a, b) => add2(a, b), [0, 0]);
	const vector = normalize2(vectorSum);
	return Math.atan2(vector[1], vector[0]);
};

export const shapes = (() => {
	let value: Shape[] = $state([]);
	return {
		get value() {
			return value;
		},
		set value(v) {
			value = v;
		},
	};
})();

const walkFaces = (
	faces_faces: (number | null | undefined)[][],
	row: number[],
	visited: { [key: number]: boolean },
) => {
	const nextRowWithDuplicates = row.flatMap((face) =>
		faces_faces[face].filter((a) => a != null).filter((f) => !visited[f]),
	);
	const nextRow = Array.from(new Set(nextRowWithDuplicates));
	nextRow.forEach((f) => {
		visited[f] = true;
	});
	return nextRow;
};

const bfTree = (faces_faces: (number | null | undefined)[][], firstRow: number[]) => {
	const visited: { [key: number]: boolean } = {};
	const tree = [firstRow];
	firstRow.forEach((f) => (visited[f] = true));
	let prevRow = firstRow;
	let nextRow;
	do {
		nextRow = walkFaces(faces_faces, prevRow, visited);
		if (!nextRow.length) {
			return tree;
		}
		tree.push(nextRow);
		prevRow = nextRow;
	} while (true);
};

type EmbeddedFace = {
	face: number; // this face's index
	// faces: number[]; // adjacent faces
	angle: number;
	radius: number;
	// coords: [number, number];
};

export const computeTutte = () => {
	const graph = $state.snapshot(fold.value) as FOLD;
	graph.edges_faces = makeEdgesFaces(graph);
	graph.faces_faces = makeFacesFaces(graph);
	// we can remove empty items, we don't need to match winding
	const faces_faces = graph.faces_faces.map((faces) => faces.filter((a) => a != null));

	// get all boundary edges, use these to get the boundary faces
	const boundaries = Boundaries(graph);
	if (!boundaries.length) {
		throw new Error("no boundaries found");
	}
	if (boundaries.length > 1) {
		throw new Error("too many boundaries");
	}
	const [boundary] = boundaries;
	const { edges: boundaryEdges } = boundary;

	const boundaryFaces = boundaryEdges
		.map((e) => graph.edges_faces[e][0])
		.filter((a) => a != null);

	// create a breadth first tree where the first row is all
	// of the boundary faces
	const tree = bfTree(faces_faces, boundaryFaces);

	// the first row of boundary faces will be spread out evenly around the circle
	const firstEmbedRow = tree[0].map((face, i) => ({
		face,
		angle: (i / boundaryFaces.length) * Math.PI * 2,
		radius: 1,
	}));

	// tree map contains a lookup, for every face, which level / depth
	// in the bf tree does this face lie?
	const treeMap: { [key: number]: number } = {};
	tree.forEach((faces, i) =>
		faces.forEach((f) => {
			treeMap[f] = i;
		}),
	);

	// this is the final embedding we are building, a list of face entities,
	// each face contains an embedding location (angle and radius)
	const embedding = [...firstEmbedRow];

	// a reverse lookup for each face, which index is it in the embedding
	const embedMap: { [key: number]: number } = {};
	firstEmbedRow.forEach(({ face }, i) => (embedMap[face] = i));

	Array.from(Array(tree.length - 1))
		.map((_, i) => i + 1)
		.map((i) => {
			const thisEmbedding: EmbeddedFace[] = [];
			const radius = 1 - i / tree.length;
			tree[i].forEach((face) => {
				// for each row in the tree, get all adjacent faces which are already
				// in the embedding (tree map index < this index)
				const prevAdjacentFaces = faces_faces[face].filter((f) => treeMap[f] < i);
				// set this face's angle to be the average of all of the parent face's angles
				const angles = prevAdjacentFaces.map((f) => {
					return embedding[embedMap[f]].angle;
				});
				const angle = averageAngles(angles);
				thisEmbedding.push({ face, angle, radius });
			});
			// update the embedMap for the index location (where the face will be)
			thisEmbedding.forEach(({ face }, j) => {
				embedMap[face] = embedding.length + j;
			});
			// add faces to the embedding
			embedding.push(...thisEmbedding);
		});

	// draw diagram
	// all of the circles (faces)
	shapes.value = embedding
		.map(({ angle: a, radius: r }) => [r * Math.cos(a), r * Math.sin(a)])
		.map(([cx, cy]) => ({ name: "circle", params: { cx, cy, r: 0.01 } }));

	// all of the lines (connections between adjacent faces)
	const lines = connectedComponentsPairs(faces_faces).map(([f0, f1]) => {
		const face0 = embedding[embedMap[f0]];
		const face1 = embedding[embedMap[f1]];
		const [x1, y1] = [
			face0.radius * Math.cos(face0.angle),
			face0.radius * Math.sin(face0.angle),
		];
		const [x2, y2] = [
			face1.radius * Math.cos(face1.angle),
			face1.radius * Math.sin(face1.angle),
		];
		return { name: "line", params: { x1, y1, x2, y2 } };
	});

	shapes.value.push(...lines);
};

export const computeFlatState = () => {
	try {
		computeTutte();
	} catch (err) {
		alert(err);
	}
};
