import type { ReactNode } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';

export interface TabItem {
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
}

// Таби з навігацією стрілками та aria-ролями «з коробки»
export default function Tabs({ tabs, defaultIndex = 0 }: TabsProps) {
  return (
    <TabGroup defaultIndex={defaultIndex}>
      <TabList className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <Tab
            key={tab.label}
            className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-600 outline-none hover:text-primary-600 data-focus:ring-2 data-focus:ring-primary-500 data-selected:border-primary-600 data-selected:text-primary-600 dark:text-gray-400"
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="pt-4">
        {tabs.map((tab) => (
          <TabPanel key={tab.label}>{tab.content}</TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
