<script lang="ts">
  let {
    data,
  }: {
    data: { label: string; isFocused: boolean; color?: string };
    [key: string]: unknown;
  } = $props();

  const borderColor = $derived(data.color ?? '#3b82f6');
</script>

<div class="boundary-node" style="border-color: {borderColor}; background: {borderColor}0a;">
  <span class="boundary-label" style="color: {borderColor};">{data.label}</span>
</div>

<style>
  .boundary-node {
    width: 100%;
    height: 100%;
    border: 1.5px solid;
    border-radius: 10px;
    opacity: 0.5;
    position: relative;
    pointer-events: none;
  }

  .boundary-label {
    position: absolute;
    top: 8px;
    left: 14px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    user-select: none;
    pointer-events: all;
    cursor: grab;
  }

  .boundary-label:active {
    cursor: grabbing;
  }
</style>
