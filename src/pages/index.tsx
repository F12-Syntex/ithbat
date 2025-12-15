import DefaultLayout from "@/layouts/default";
import { ResearchContainer } from "@/components/research";

export default function IndexPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center py-8 md:py-16">
        <ResearchContainer />
      </section>
    </DefaultLayout>
  );
}
