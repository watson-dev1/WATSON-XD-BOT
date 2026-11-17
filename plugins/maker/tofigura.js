import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tofigura',
    category: 'maker',
    description: 'AI Image: tofigura',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tofigura', ctx.prefix); }
};