<script lang="ts">
	import type { FOLD } from "rabbit-ear/types.js";
	import WebGLRender from "./WebGLRender.svelte";
	import { renderer } from "../../stores/renderer.svelte.ts";
	import {
		rotateViewMatrix,
		zoomViewMatrix,
	} from "../../general/math.ts";

	type WebGLCanvasProps = {
		fold?: FOLD,
	};

	let { fold = {} }: WebGLCanvasProps = $props();
	let prevVector: [number, number]|undefined;

	const onpress = (event: MouseEvent & { vector: [number, number] } ) => {
		event.preventDefault();
		const { vector } = event;
		prevVector = vector;
	};

	const onmove = (event: MouseEvent & { vector: [number, number] } ) => {
		event.preventDefault();
		const { vector } = event;
		const buttons = prevVector ? 1 : 0;
		if (buttons && prevVector && vector) {
			renderer.ViewMatrix = rotateViewMatrix("perspective", renderer.ViewMatrix, vector, prevVector);
			prevVector = vector;
		}
	};

	const onrelease = () => {
		prevVector = undefined;
	};

	const onscroll = (event: WheelEvent) => {
		const { deltaY } = event;
		if (deltaY !== undefined) {
			const scrollSensitivity = 1 / 100;
			const delta = -deltaY * scrollSensitivity;
			if (Math.abs(delta) < 1e-3) { return; }
			renderer.ViewMatrix = zoomViewMatrix("perspective", renderer.ViewMatrix, delta);
		}
	};
</script>

<WebGLRender
	{fold}
	viewMatrix={renderer.ViewMatrix}
	{onpress}
	{onmove}
	{onrelease}
	{onscroll}
/>
