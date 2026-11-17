import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tolego',
    category: 'maker',
    description: 'AI Image: tolego',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tolego', ctx.prefix); }
};