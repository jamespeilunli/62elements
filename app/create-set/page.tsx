import CreateSetForm from '@/components/create-set-form';

export default function CreateSetPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-5">Create a New Flashcard Set</h1>
      <CreateSetForm />
    </div>
  );
}
