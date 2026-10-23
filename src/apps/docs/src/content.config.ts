import { readFile } from 'node:fs/promises';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { defineCollection } from 'astro:content';

const loader = docsLoader();

export const collections = {
  docs: defineCollection({
    loader: {
      ...loader,
      load(context) {
        return loader.load({
          ...context,
          async parseData(entry) {
            if (entry.data.title === undefined && entry.filePath) {
              const content = await readFile(entry.filePath, 'utf8');
              const title = content.match(/^#\s+(.+?)(?:\s+#+)?\s*$/m)?.[1] ?? entry.id;
              return context.parseData({ ...entry, data: { ...entry.data, title } });
            }
            return context.parseData(entry);
          },
        });
      },
    },
    schema: docsSchema(),
  }),
};
