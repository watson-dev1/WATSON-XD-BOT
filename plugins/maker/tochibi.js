import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tochibi',
    category: 'maker',
    description: 'AI Image: tochibi',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tochibi', ctx.prefix); }
};