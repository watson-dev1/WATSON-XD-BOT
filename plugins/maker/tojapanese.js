import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tojapanese',
    category: 'maker',
    description: 'AI Image: tojapanese',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tojapanese', ctx.prefix); }
};