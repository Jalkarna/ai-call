
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
         <Skeleton className="h-8 w-[200px]" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[100px]" />
            </CardContent>
          </Card>
        ))}
      </div>

       <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="xl:col-span-2">
                 <CardHeader>
                    <Skeleton className="h-6 w-[150px]" />
                 </CardHeader>
                 <CardContent>
                     <Skeleton className="h-[200px] w-full" />
                 </CardContent>
            </Card>
             <Card>
                 <CardHeader>
                    <Skeleton className="h-6 w-[150px]" />
                 </CardHeader>
                 <CardContent className="space-y-4">
                     {Array.from({ length: 5 }).map((_, i) => (
                        <div className="flex items-center gap-4" key={i}>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-3 w-[100px]" />
                            </div>
                        </div>
                     ))}
                 </CardContent>
            </Card>
       </div>
    </div>
  );
}
