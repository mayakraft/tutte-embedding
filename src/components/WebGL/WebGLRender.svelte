<script lang="ts">
	import earcut from "earcut";
	import type { FOLD, WebGLModel } from "rabbit-ear/types.js";
	import {
		identity4x4,
		multiplyMatrices4,
	} from "rabbit-ear/math/matrix4.js";
	import { initializeWebGL } from "rabbit-ear/webgl/general/webgl.js";
	import {
		rebuildViewport,
		makeProjectionMatrix,
		makeModelMatrix,
	} from "rabbit-ear/webgl/general/view.js";
	import { foldedForm } from "rabbit-ear/webgl/foldedForm/models.js";
	import {
		drawModel,
		deallocModel,
	} from "rabbit-ear/webgl/general/model.js";
	import { dark } from "rabbit-ear/webgl/general/colors.js";
	import { vectorFromScreenLocation } from "../../general/math.ts";
	import { renderer } from "../../stores/renderer.svelte.ts";

	type WebGLRenderProps = {
		fold?: FOLD,
		viewMatrix?: number[],
		fov?: number,
		onpress?: Function,
		onmove?: Function,
		onrelease?: Function,
		onscroll?: Function,
	};

	let {
		fold = {},
		viewMatrix = [...identity4x4],
		fov = 30.25,
		onpress,
		onmove,
		onrelease,
		onscroll,
	}: WebGLRenderProps = $props();

	let canvas: HTMLCanvasElement|undefined = $state(undefined);
	let { gl, version } = $derived(canvas
		? initializeWebGL(canvas)
		: ({ gl: undefined, version: 0 }));
	let canvasSize: [number, number] = $state([1, 1]);
	let modelMatrix = $derived(makeModelMatrix(fold));
	let modelViewMatrix = $derived(multiplyMatrices4(viewMatrix, modelMatrix));
	let projectionMatrix = $derived(makeProjectionMatrix(canvasSize, "perspective", fov));
	let cursorScreen: [number, number] = $state([0, 0]);
	let cursorWorld: [number, number] = $state([0, 0]);

	let uniformOptions = $derived({
		projectionMatrix,
		modelViewMatrix,
		canvas,
		// // these are only used by touchIndicators
		// cursorWorld,
		// cursorScreen,
		frontColor: renderer.FrontColor,
		backColor: renderer.BackColor,
		outlineColor: "black",
		cpColor: "#111111",
		strokeWidth: renderer.StrokeWidth,
		opacity: 1,
	});

	let programOptions = $derived({
		...dark,
		layerNudge: renderer.LayerNudge,
		outlines: renderer.ShowFoldedFaceOutlines,
		edges: renderer.ShowFoldedCreases,
		faces: renderer.ShowFoldedFaces,
		earcut,
	});

	let models: WebGLModel[] = $derived.by(() => {
		try {
			if (!gl) { return []; }
			// deallocModels();
			return [...foldedForm(gl, version, fold, programOptions)];
				// ...touchIndicators(gl, programOptions),
		} catch (error) {
			console.error(error);
			return [];
		}
	});

	let uniforms = $derived(models.map(model => model.makeUniforms(uniformOptions)));

	const deallocModels = () => models.forEach(model => deallocModel(gl, model));

	const onresize = () => {
		if (!gl || !canvas) { return; }
		rebuildViewport(gl, canvas);
		canvasSize = [canvas.clientWidth, canvas.clientHeight];
	};

	const formatEvent = (event: MouseEvent): MouseEvent & { vector: [number, number] } => {
		const screenPoint: [number, number] = [event.offsetX, event.offsetY];
		const vector = vectorFromScreenLocation(screenPoint, canvasSize, projectionMatrix);
		return Object.assign(event, { vector });
	};

	const formatTouchEvent = (event: TouchEvent): TouchEvent & { vector: [number, number] } => {
		const screenPoint: [number, number] = event.touches.length
			? [event.touches[0].clientX, event.touches[0].clientY]
			: [0, 0];
		const vector = vectorFromScreenLocation(screenPoint, canvasSize, projectionMatrix);
		return Object.assign(event, { vector });
	};

	const onmousedown = onpress ? (e: MouseEvent) => onpress(formatEvent(e)) : undefined;
	const onmousemove = onmove ? (e: MouseEvent) => {
		const event = formatEvent(e);
		cursorScreen = [e.offsetX, e.offsetY];
		cursorWorld = event.vector ? event.vector : [0, 0];
		return onmove(event);
	} : undefined;
	const onmouseup = onrelease ? (e: MouseEvent) => onrelease(formatEvent(e)) : undefined;
	const ontouchstart = onpress ? (e: TouchEvent) => onpress(formatTouchEvent(e)) : undefined;
	const ontouchmove = onmove ? (e: TouchEvent) => onmove(formatTouchEvent(e)) : undefined;
	const ontouchend = onrelease ? (e: TouchEvent) => onrelease(formatTouchEvent(e)) : undefined;
	const onwheel = onscroll ? (e: WheelEvent) => onscroll(e) : undefined;

	$effect(() => {
		if (!gl || !canvas) { return; }
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		rebuildViewport(gl, canvas);
		canvasSize = [canvas.clientWidth, canvas.clientHeight];
	});

	$effect(() => {
		if (!gl) { return; }
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		models.forEach((model, i) => drawModel(gl, version, model, uniforms[i]));
	});

	$effect(() => {
		// return a function to be later called on page deallocation
		return deallocModels;
	});
</script>

<svelte:window {onresize} />

<canvas
	bind:this={canvas}
	{onmousedown}
	{onmousemove}
	{onmouseup}
	{onwheel}
	{ontouchstart}
	{ontouchmove}
	{ontouchend}></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
	}
</style>
