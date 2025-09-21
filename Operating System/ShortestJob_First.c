#include <stdio.h>


typedef struct
{
    int pid;          
    int at; 
    int bt;   
    int wt;
    int tat;
} Process;


void sort(Process p[], int n)
{
    for (int i = 0; i < n - 1; i++)
    {
        for (int j = 0; j < n - i - 1; j++)
        {
            if (p[j].at > p[j + 1].at || (p[j].at == p[j + 1].at && p[j].bt > p[j + 1].bt))
            {
                Process temp = p[j];
                p[j] = p[j + 1];
                p[j + 1] = temp;
            }
        }
    }
}


void sjf(Process p[], int n)
{
    float total_wt = 0, total_tat = 0;
    int completion_time = 0;

    for (int i = 0; i < n; i++)
    {
        if (completion_time < p[i].at)
        {
            completion_time = p[i].at;
        }
        p[i].wt = completion_time - p[i].at;
        completion_time += p[i].bt;
        p[i].tat = p[i].wt + p[i].bt;

        total_wt += p[i].wt;
        total_tat += p[i].tat;
    }
    printf("\nAverage Waiting Time: %.2f\n", total_wt / n);
    printf("Average Turnaround Time: %.2f\n", total_tat / n);
}

int main()
{
    int n;
    printf("Enter the number of p: ");
    scanf("%d", &n);

    Process p[n];

    printf("Enter the arrival and burst times for each process:\n");
    for (int i = 0; i < n; i++)
    {
        p[i].pid = i + 1;
        printf("P%d Arrival Time: ", i + 1);
        scanf("%d", &p[i].at);
        printf("P%d Burst Time: ", i + 1);
        scanf("%d", &p[i].bt);
    }


    sort(p, n);


    sjf(p, n);

    return 0;
}
