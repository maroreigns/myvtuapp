import AdminTransactionsPage from "@/app/admin/transactions/page";

export default function FailedTransactionsPage() {
  return <AdminTransactionsPage searchParams={{ status: "FAILED" }} />;
}
