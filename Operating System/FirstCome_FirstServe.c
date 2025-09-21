#include <stdio.h>

struct Process
{
    int pid;
    int at;
    int bt;
    int ct;
    int tat; 
    int wt;
};

void fcfs(struct Process p[], int n)
{
    float total_tat = 0, total_wt = 0;
    int time = 0;

    for (int i = 0; i < n; i++)
    {
        if (time < p[i].at)
        {
            time = p[i].at; 
        }
        p[i].ct = time + p[i].bt;     
        p[i].tat = p[i].ct - p[i].at; 
        p[i].wt = p[i].tat - p[i].bt; 
        time = p[i].ct;               

        total_tat += p[i].tat;
        total_wt += p[i].wt;
    }


    printf("Average Turnaround Time: %f\n", (total_tat / n));
    printf("Average Waiting Time: %f", (total_wt / n));
}

int main()
{
    int n;
    printf("Enter the number of processes: ");
    scanf("%d", &n);

    struct Process p[n];

    printf("Enter Arrival Time and Burst Time\n");
    for (int i = 0; i < n; i++)
    {
        p[i].pid = i + 1;
        printf("Process %d (AT BT): ", i + 1);
        scanf("%d %d", &p[i].at, &p[i].bt);
    }

    fcfs(p, n);

    return 0;
}