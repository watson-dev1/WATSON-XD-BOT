import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'topiramida',
    category: 'maker',
    description: 'AI Image: topiramida',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'topiramida', ctx.prefix); }
};