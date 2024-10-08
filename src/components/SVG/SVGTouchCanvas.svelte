<script lang="ts">
	import type { Snippet } from "svelte";
	import SVGCanvas from "./SVGCanvas.svelte";
	import { type ScaledMouseEvent, type ScaledWheelEvent } from "../../types.ts";
	import {
		convertToViewBox,
		findInParents,
	} from "../../general/dom.ts";

	interface PropsType {
		svg?: SVGSVGElement,
		viewBox?: string,
		invertVertical?: boolean,
		onmousedown?: (e: ScaledMouseEvent) => void,
		onmousemove?: (e: ScaledMouseEvent) => void,
		onmouseup?: (e: ScaledMouseEvent) => void,
		onmouseleave?: (e: ScaledMouseEvent) => void,
		onwheel?: (e: ScaledWheelEvent) => void,
		children?: Snippet,
	};

	let {
		svg = $bindable(),
		viewBox = "0 0 1 1",
		invertVertical = false,
		onmousedown: down,
		onmousemove: move,
		onmouseup: up,
		onmouseleave: leave,
		onwheel: wheel,
		children,
		...rest
	}: PropsType = $props();

	const getSVG = (e: MouseEvent): SVGSVGElement => {
		if (svg) { return svg; }
		const foundSVG = findInParents(e.target, "svg") as SVGSVGElement;
		return foundSVG;
	};

	let scale = 1;
	const unwrap = (point: [number, number]): [number, number] => [
		(1 / scale) * point[0],
		(1 / scale) * point[1] * (invertVertical ? -1 : 1),
	];

	const formatMouseEvent = (e: MouseEvent): ScaledMouseEvent => Object.assign(e, {
		id: svg?.getAttribute("id") || undefined,
		// buttons: e.buttons,
		point: unwrap(convertToViewBox(getSVG(e), [e.x, e.y])),
	});

	const formatWheelEvent = (e: WheelEvent): ScaledWheelEvent => Object.assign(e, {
		id: svg?.getAttribute("id") || undefined,
		// wheelDelta: e.wheelDelta,
		// wheelDelta: e.deltaMode,
		// wheelDelta: e.deltaY,
		point: convertToViewBox(getSVG(e), [e.x, e.y]),
	});

	const onmousedown = (e: MouseEvent) => down?.(formatMouseEvent(e));
	const onmousemove = (e: MouseEvent) => move?.(formatMouseEvent(e));
	const onmouseup = (e: MouseEvent) => up?.(formatMouseEvent(e));
	const onmouseleave = (e: MouseEvent) => leave?.(formatMouseEvent(e));
	const onwheel = (e: WheelEvent) => wheel?.(formatWheelEvent(e));
</script>

<SVGCanvas
	bind:svg={svg}
	{viewBox}
	{invertVertical}
	{onmousedown}
	{onmousemove}
	{onmouseup}
	{onmouseleave}
	{onwheel}
	{...rest}>
	{#if children}
		{@render children()}
	{/if}
</SVGCanvas>
