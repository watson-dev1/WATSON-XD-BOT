import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'tozombie',
    category: 'maker',
    description: 'AI Image: tozombie',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'tozombie', ctx.prefix); }
};