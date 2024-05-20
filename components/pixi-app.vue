<template>
    <div id="entry"></div>
</template>
<script lang="ts">
import { Application } from '../application';

export default {
    mounted: () => {
        const entryDocument = document.getElementById('entry')!;
        const pixiApp = new Application(entryDocument);
    }
};
</script>
<style lang="scss">
body {
    margin: 0;
    overflow: hidden;
}
</style>
