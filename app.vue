<template>
    <client-only>
        <pixi-app />
    </client-only>
</template>
<script>

export default {
    components: {
        'pixi-app': () => import('@/components/pixi-app.vue')
    }
};
</script>
