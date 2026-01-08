/**
 * YAML Loader - Simple wrapper around js-yaml
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export const yamlLoader = {
  /**
   * Load YAML file
   */
  load<T = unknown>(filePath: string): T | null {
    try {
      const fullPath = path.join(process.cwd(), "public", filePath);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      return yaml.load(fileContents) as T;
    } catch (error) {
      console.error(`Error loading YAML file ${filePath}:`, error);
      return null;
    }
  },

  /**
   * Load YAML file async
   */
  async loadAsync<T = unknown>(filePath: string): Promise<T | null> {
    try {
      const fullPath = path.join(process.cwd(), "public", filePath);
      const fileContents = await fs.promises.readFile(fullPath, "utf8");
      return yaml.load(fileContents) as T;
    } catch (error) {
      console.error(`Error loading YAML file ${filePath}:`, error);
      return null;
    }
  },
};
