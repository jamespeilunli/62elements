export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 py-12 container mx-auto px-4 max-w-3xl flex flex-col">
        <h1 className="text-3xl font-bold mb-6">About FlashMaster</h1>
        <p>Check out the {" "}
          <a
            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
            href="https://github.com/jamespeilunli/62elements">
            GitHub
          </a>
        !</p>
      </main>
    </div>
  )
}