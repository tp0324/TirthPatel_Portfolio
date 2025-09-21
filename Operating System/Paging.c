#include <stdio.h>
#include <stdbool.h>

#define MAX_FRAMES 10
#define MAX_PAGES 50

int fifo(int pages[], int n, int frames)
{
    int page_faults = 0;
    int frame_set[MAX_FRAMES];
    int front = 0;

    for (int i = 0; i < frames; i++)
        frame_set[i] = -1;

    for (int i = 0; i < n; i++)
    {
        bool found = false;
        for (int j = 0; j < frames; j++)
        {
            if (frame_set[j] == pages[i])
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            frame_set[front] = pages[i];
            front = (front + 1) % frames;
            page_faults++;
        }
    }
    return page_faults;
}

int lru(int pages[], int n, int frames)
{
    int page_faults = 0;
    int frame_set[MAX_FRAMES];
    int recent[MAX_FRAMES];

    for (int i = 0; i < frames; i++)
    {
        frame_set[i] = -1;
        recent[i] = 0;
    }

    for (int i = 0; i < n; i++)
    {
        bool found = false;
        for (int j = 0; j < frames; j++)
        {
            if (frame_set[j] == pages[i])
            {
                found = true;
                recent[j] = i + 1;
                break;
            }
        }

        if (!found)
        {
            int lru_index = 0;
            for (int j = 1; j < frames; j++)
            {
                if (recent[j] < recent[lru_index])
                {
                    lru_index = j;
                }
            }
            frame_set[lru_index] = pages[i];
            recent[lru_index] = i + 1;
            page_faults++;
        }
    }
    return page_faults;
}

int optimal(int pages[], int n, int frames)
{
    int page_faults = 0;
    int frame_set[MAX_FRAMES];

    for (int i = 0; i < frames; i++)
        frame_set[i] = -1;

    for (int i = 0; i < n; i++)
    {
        bool found = false;
        for (int j = 0; j < frames; j++)
        {
            if (frame_set[j] == pages[i])
            {
                found = true;
                break;
            }
        }

        if (!found)
        {
            int farthest = -1, replace_index = 0;
            for (int j = 0; j < frames; j++)
            {
                int k;
                for (k = i + 1; k < n; k++)
                {
                    if (frame_set[j] == pages[k])
                        break;
                }
                if (k == n)
                {
                    replace_index = j;
                    break;
                }
                if (k > farthest)
                {
                    farthest = k;
                    replace_index = j;
                }
            }
            frame_set[replace_index] = pages[i];
            page_faults++;
        }
    }
    return page_faults;
}

int main()
{
    int pages[MAX_PAGES];
    int n, frames;

    printf("Enter number of pages: ");
    scanf("%d", &n);

    printf("Enter page reference string: ");
    for (int i = 0; i < n; i++)
        scanf("%d", &pages[i]);

    printf("Enter number of frames: ");
    scanf("%d", &frames);

    printf("\nFIFO Page Faults: %d\n", fifo(pages, n, frames));
    printf("LRU Page Faults: %d\n", lru(pages, n, frames));
    printf("Optimal Page Faults: %d\n", optimal(pages, n, frames));

    return 0;
}