import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'toroh',
    category: 'maker',
    description: 'AI Image: toroh',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'toroh', ctx.prefix); }
};