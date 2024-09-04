// this "identity" matrix is for the ViewMatrix and positions the camera
// in the negative z axis looking directly at the model.
// This works for both perspective and orthographic.
const GL_IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1.85, 1];

export const renderer = $state({
	// the camera's field of view
	FOV: 30,
	// flip the camera around so that we are
	// looking at the model from directly behind
	FlipCameraZ: false,
	// stroke width of the crease edges
	StrokeWidth: 0.0025,
	// opacity of the 3D model
	Opacity: 1.0,
	// the colors of the origami model
	FrontColor: "#1177FF",
	BackColor: "#ffffff",
	// show/hide things
	ShowFoldedCreases: false,
	ShowFoldedFaces: true,
	ShowFoldedFaceOutlines: true,
	// if a 3D model comes with faceOrders, this is
	// the amount of space between overlapping faces
	LayerNudge: 1e-6,
	ViewMatrix: [...GL_IDENTITY],
});
