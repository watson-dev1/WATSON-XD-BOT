import { convertToImage } from '../../lib/toimage.js';
export default {
    command: 'toghibli',
    category: 'maker',
    description: 'AI Image: toghibli',
    async execute(denn, m, ctx) { return convertToImage(denn, m, 'toghibli', ctx.prefix); }
};