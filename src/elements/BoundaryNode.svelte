<script lang="ts">
  let {
    data,
  }: {
    data: { label: string; isFocused: boolean };
    [key: string]: unknown;
  } = $props();
</script>

<div class="boundary-node">
  <span class="boundary-label">{data.label}</span>
</div>

<style>
  .boundary-node {
    width: 100%;
    height: 100%;
    border: 1.5px dashed #94a3b8;
    border-radius: 10px;
    background: transparent;
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
    color: #64748b;
    user-select: none;
    pointer-events: all;
    cursor: grab;
  }

  .boundary-label:active {
    cursor: grabbing;
  }

</style>
